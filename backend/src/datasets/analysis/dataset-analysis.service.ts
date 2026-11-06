import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { ColumnMetadata } from '../dataset-processing.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AggregateRequestDto,
  AggregationOperation,
  ChartType,
  FilterDto,
  FilterOperator,
  VisualizationRequestDto,
} from './dto/analysis-request.dto';

const ROW_PAGE_SIZE = 500;
const MAX_SCANNED_ROWS = 500_000;
const MAX_CATEGORY_PIE_SLICES = 20;
type ColumnType = ColumnMetadata['type'];
type DataRow = Record<string, unknown>;

interface DatasetShape {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  columns: unknown;
  columnMetadata: unknown;
  profiling: unknown;
}

interface AggregateMetric {
  column?: string;
  operation: AggregationOperation;
}

interface AggregateBucket {
  groups: unknown[];
  count: number;
  metrics: Array<{ count: number; sum: number; min: number | null; max: number | null; distinct: Set<string> }>;
}

@Injectable()
export class DatasetAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async analysis(userId: string, datasetId: string) {
    const dataset = await this.findDataset(userId, datasetId);
    const columns = this.columnsOf(dataset);
    const metadata = this.columnsOf(dataset);
    const typeSummary = columns.reduce<Record<string, number>>((summary, column) => {
      summary[column.type] = (summary[column.type] ?? 0) + 1;
      return summary;
    }, {});
    const numericStatistics = columns
      .filter((column) => column.type === 'number')
      .map(({ name, nullCount, uniqueCount, min, max, mean }) => ({ name, nullCount, uniqueCount, min, max, mean }));
    const categoricalSummary = columns
      .filter((column) => column.type === 'category' || column.type === 'text' || column.type === 'boolean')
      .map(({ name, type, nullCount, uniqueCount }) => ({ name, type, nullCount, uniqueCount }));
    const profiling = this.asObject(dataset.profiling);
    const recommendations = this.recommendations(columns);
    return {
      success: true,
      data: {
        overview: { id: dataset.id, name: dataset.name, totalRows: dataset.rowCount, totalColumns: dataset.columnCount },
        columnTypes: typeSummary,
      columns: metadata,
        numericStatistics,
        categoricalSummary,
        dateRange: Array.isArray(profiling.dateRange) ? profiling.dateRange : [],
        dataQuality: profiling.dataQuality ?? { missingValues: 0, duplicateRows: 0, score: 100 },
        recommendations,
      },
    };
  }

  async aggregate(userId: string, datasetId: string, request: AggregateRequestDto) {
    const requestedMetrics = request.metrics ?? [];
    if (requestedMetrics.length === 0) throw new BadRequestException('metrics harus berisi minimal satu metrik.');
    const dataset = await this.findDataset(userId, datasetId);
    const columns = this.columnsOf(dataset);
    const byName = new Map(columns.map((column) => [column.name, column]));
    const groupBy = this.validateGroupBy(request.groupBy ?? [], byName);
    const metrics = this.validateMetrics(requestedMetrics, byName);
    const filters = this.validateFilters(request.filters ?? [], byName);
    const metricKeys = metrics.map((_metric, index) => `metric_${index + 1}`);
    this.validateSort(request.sort, groupBy, metricKeys);
    this.checkScanSize(dataset.rowCount);

    const groups = new Map<string, AggregateBucket>();
    if (groupBy.length === 0) groups.set('[]', this.emptyBucket([], metrics.length));
    for await (const row of this.readRows(datasetId, dataset.rowCount)) {
      if (!filters.every((filter) => this.matchesFilter(row[filter.column], filter, byName.get(filter.column)!.type))) continue;
      const groupValues = groupBy.map((name) => row[name] ?? null);
      const key = JSON.stringify(groupValues);
      const bucket = groups.get(key) ?? this.emptyBucket(groupValues, metrics.length);
      bucket.count += 1;
      metrics.forEach((metric, index) => this.addMetric(bucket.metrics[index], metric, row, byName.get(metric.column ?? '')?.type));
      groups.set(key, bucket);
    }

    const data = [...groups.values()].map((bucket) => {
      const groupsObject = Object.fromEntries(groupBy.map((name, index) => [name, bucket.groups[index]]));
      const metricsObject = Object.fromEntries(metrics.map((metric, index) => [
        metricKeys[index], this.metricValue(metric, bucket.metrics[index]),
      ]));
      return { ...groupsObject, ...metricsObject };
    });
    if (request.sort) {
      const type = byName.get(request.sort.column)?.type ?? 'number';
      data.sort((left, right) => this.compare(left[request.sort!.column], right[request.sort!.column], type)
        * (request.sort!.direction === 'desc' ? -1 : 1));
    }
    const limit = Math.min(request.limit ?? 100, 1000);
    return {
      success: true,
      data: {
        datasetId,
        groupBy,
        metrics: metrics.map((metric, index) => ({ key: metricKeys[index], column: metric.column ?? null, operation: metric.operation })),
        filters: request.filters ?? [],
        totalGroups: data.length,
        limit,
        results: data.slice(0, limit),
      },
    };
  }

  async visualizationData(userId: string, datasetId: string, request: VisualizationRequestDto) {
    const dataset = await this.findDataset(userId, datasetId);
    const columns = this.columnsOf(dataset);
    const byName = new Map(columns.map((column) => [column.name, column]));
    const x = byName.get(request.xAxis);
    const y = byName.get(request.yAxis);
    if (!x || !y) throw new BadRequestException('xAxis dan yAxis harus menunjuk kolom dataset yang tersedia.');
    this.validateChartType(request.chartType, x, y, request.aggregation);
    if (request.chartType === ChartType.Scatter) {
      if ((request.groupBy?.length ?? 0) > 0 || (request.metrics?.length ?? 0) > 0) {
        throw new BadRequestException('Scatter chart menggunakan pasangan baris langsung dan tidak menerima groupBy atau metrics.');
      }
      return this.scatterData(userId, dataset, request, columns);
    }
    const groupBy = [...new Set([request.xAxis, ...(request.groupBy ?? [])])];
    if ((request.chartType === ChartType.Pie || request.chartType === ChartType.Donut) && groupBy.length > 1) {
      throw new BadRequestException('Pie dan donut chart hanya mendukung xAxis sebagai groupBy.');
    }
    if (groupBy.includes(request.yAxis)) throw new BadRequestException('yAxis tidak boleh menjadi groupBy.');
    const aggregateRequest: AggregateRequestDto = {
      groupBy,
      metrics: [{ column: request.yAxis, operation: request.aggregation ?? AggregationOperation.Average }],
      filters: request.filters ?? [],
      sort: request.sort ? {
        direction: request.sort.direction,
        column: request.sort.column === request.yAxis || request.sort.column === 'value'
          ? 'metric_1'
          : request.sort.column,
      } : undefined,
      limit: request.limit ?? 100,
    };
    const result = await this.aggregate(userId, dataset.id, aggregateRequest);
    const aggregateData = result.data as { results: DataRow[]; totalGroups: number; limit: number };
    const data = aggregateData.results.map((item) => {
      const { metric_1: value, ...groupValues } = item;
      return { ...groupValues, value };
    });
    return {
      success: true,
      chart: {
        type: request.chartType,
        xAxis: request.xAxis,
        yAxis: request.yAxis,
        aggregation: request.aggregation ?? AggregationOperation.Average,
        groupBy,
        totalGroups: aggregateData.totalGroups,
        limit: aggregateData.limit,
      },
      data,
    };
  }

  async validateSavedVisualization(userId: string, datasetId: string, request: VisualizationRequestDto) {
    const dataset = await this.findDataset(userId, datasetId);
    const columns = this.columnsOf(dataset);
    const byName = new Map(columns.map((column) => [column.name, column]));
    const x = byName.get(request.xAxis);
    const y = byName.get(request.yAxis);
    if (!x || !y) throw new BadRequestException('xAxis dan yAxis harus menunjuk kolom dataset yang tersedia.');
    const aggregation = request.aggregation ?? AggregationOperation.Average;
    this.validateChartType(request.chartType, x, y, aggregation);
    const groupBy = [...new Set([request.xAxis, ...(request.groupBy ?? [])])];
    if (request.chartType === ChartType.Scatter && (groupBy.length > 1 || (request.metrics?.length ?? 0) > 0)) {
      throw new BadRequestException('Konfigurasi scatter tidak menerima groupBy tambahan atau metrics.');
    }
    if ((request.chartType === ChartType.Pie || request.chartType === ChartType.Donut) && groupBy.length > 1) {
      throw new BadRequestException('Pie dan donut chart hanya mendukung xAxis sebagai groupBy.');
    }
    if (groupBy.includes(request.yAxis)) throw new BadRequestException('yAxis tidak boleh menjadi groupBy.');
    this.validateGroupBy(groupBy, byName);
    this.validateFilters(request.filters ?? [], byName);
    if (aggregation !== AggregationOperation.Count) {
      this.validateMetrics([{ column: request.yAxis, operation: aggregation }], byName);
    }
    const sortColumn = request.sort?.column === request.yAxis || request.sort?.column === 'value'
      ? 'metric_1'
      : request.sort?.column;
    this.validateSort(sortColumn && request.sort ? { column: sortColumn, direction: request.sort.direction } : undefined,
      groupBy, ['metric_1']);
    return {
      chartType: request.chartType,
      xAxis: request.xAxis,
      yAxis: request.yAxis,
      groupBy,
      aggregation,
      filters: request.filters ?? [],
      sort: request.sort ?? null,
      limit: Math.min(request.limit ?? 100, 1000),
    };
  }

  private async scatterData(userId: string, dataset: DatasetShape, request: VisualizationRequestDto, columns: ColumnMetadata[]) {
    const byName = new Map(columns.map((column) => [column.name, column]));
    const filters = this.validateFilters(request.filters ?? [], byName);
    this.validateSort(request.sort, [], [request.xAxis, request.yAxis]);
    this.checkScanSize(dataset.rowCount);
    const data: DataRow[] = [];
    for await (const row of this.readRows(dataset.id, dataset.rowCount)) {
      if (!filters.every((filter) => this.matchesFilter(row[filter.column], filter, byName.get(filter.column)!.type))) continue;
      if (!this.isPresent(row[request.xAxis]) || !this.isPresent(row[request.yAxis])) continue;
      data.push({ [request.xAxis]: this.numeric(row[request.xAxis]), [request.yAxis]: this.numeric(row[request.yAxis]) });
    }
    if (request.sort) {
      const type = byName.get(request.sort.column)?.type ?? 'number';
      data.sort((left, right) => this.compare(left[request.sort!.column], right[request.sort!.column], type)
        * (request.sort!.direction === 'desc' ? -1 : 1));
    }
    const limit = Math.min(request.limit ?? 100, 1000);
    return {
      success: true,
      chart: { type: request.chartType, xAxis: request.xAxis, yAxis: request.yAxis, aggregation: null, totalGroups: data.length, limit },
      data: data.slice(0, limit),
    };
  }

  private validateChartType(chartType: ChartType, x: ColumnMetadata, y: ColumnMetadata, aggregation: AggregationOperation) {
    if (chartType === ChartType.Scatter) {
      if (x.type !== 'number' || y.type !== 'number') throw new BadRequestException('Scatter chart memerlukan dua kolom numerik.');
      return;
    }
    if (aggregation !== AggregationOperation.Count && y.type !== 'number') {
      throw new BadRequestException('yAxis harus berupa kolom numerik untuk agregasi ini.');
    }
    if (chartType === ChartType.Pie || chartType === ChartType.Donut) {
      if (x.type !== 'category' && x.type !== 'boolean') throw new BadRequestException('Pie dan donut chart memerlukan kolom kategorikal.');
      if (x.uniqueCount > MAX_CATEGORY_PIE_SLICES) throw new BadRequestException(`Pie chart dibatasi hingga ${MAX_CATEGORY_PIE_SLICES} kategori.`);
      return;
    }
    if (x.type !== 'category' && x.type !== 'boolean' && x.type !== 'date') {
      throw new BadRequestException(`${chartType} chart memerlukan xAxis kategorikal atau tanggal.`);
    }
  }

  private validateGroupBy(names: string[], columns: Map<string, ColumnMetadata>) {
    if (names.length > 3) throw new BadRequestException('Maksimal 3 kolom groupBy.');
    if (new Set(names).size !== names.length) throw new BadRequestException('groupBy tidak boleh berisi kolom duplikat.');
    for (const name of names) if (!columns.has(name)) throw new BadRequestException(`Kolom groupBy tidak ditemukan: ${name}`);
    return names;
  }

  private validateMetrics(metrics: AggregateMetric[], columns: Map<string, ColumnMetadata>) {
    if (metrics.length > 10) throw new BadRequestException('Maksimal 10 metrics dalam satu request.');
    return metrics.map((metric) => {
      if (metric.operation !== AggregationOperation.Count && !metric.column) {
        throw new BadRequestException(`Operasi ${metric.operation} memerlukan column.`);
      }
      if (metric.column && !columns.has(metric.column)) throw new BadRequestException(`Kolom metric tidak ditemukan: ${metric.column}`);
      if ([AggregationOperation.Sum, AggregationOperation.Average, AggregationOperation.Minimum, AggregationOperation.Maximum].includes(metric.operation)) {
        if (columns.get(metric.column!)?.type !== 'number') throw new BadRequestException(`${metric.operation} hanya mendukung kolom numerik.`);
      }
      return metric;
    });
  }

  private validateFilters(filters: FilterDto[], columns: Map<string, ColumnMetadata>) {
    if (filters.length > 20) throw new BadRequestException('Maksimal 20 filters dalam satu request.');
    for (const filter of filters) {
      const column = columns.get(filter.column);
      if (!column) throw new BadRequestException(`Kolom filter tidak ditemukan: ${filter.column}`);
      if (filter.operator === FilterOperator.Contains && column.type !== 'text' && column.type !== 'category') {
        throw new BadRequestException('contains hanya mendukung kolom text atau category.');
      }
      if (filter.operator === FilterOperator.In && (!Array.isArray(filter.value) || filter.value.length > 100)) {
        throw new BadRequestException('Operator in memerlukan array dengan maksimal 100 nilai.');
      }
      if (filter.operator !== FilterOperator.IsNull && filter.operator !== FilterOperator.In && !this.isPresent(filter.value)) {
        throw new BadRequestException(`${filter.operator} memerlukan value.`);
      }
      if (filter.operator === FilterOperator.Contains && (typeof filter.value !== 'string' || filter.value.length > 200)) {
        throw new BadRequestException('contains memerlukan string hingga 200 karakter.');
      }
      if ([FilterOperator.GreaterThan, FilterOperator.GreaterThanOrEqual, FilterOperator.LessThan, FilterOperator.LessThanOrEqual].includes(filter.operator)
        && column.type !== 'number' && column.type !== 'date') {
        throw new BadRequestException(`${filter.operator} hanya mendukung kolom numerik atau tanggal.`);
      }
      if (filter.operator === FilterOperator.IsNull && filter.value !== undefined && typeof filter.value !== 'boolean') {
        throw new BadRequestException('isNull value harus boolean jika dikirim.');
      }
      const values = filter.operator === FilterOperator.In ? filter.value as unknown[] : [filter.value];
      if (column.type === 'number' && values.some((value) => value !== undefined && !Number.isFinite(Number(value)))) {
        throw new BadRequestException(`Filter ${filter.column} memerlukan nilai numerik.`);
      }
      if (column.type === 'date' && values.some((value) => value !== undefined && Number.isNaN(Date.parse(this.scalarString(value))))) {
        throw new BadRequestException(`Filter ${filter.column} memerlukan nilai tanggal yang valid.`);
      }
    }
    return filters;
  }

  private validateSort(sort: AggregateRequestDto['sort'], groupBy: string[], metricKeys: string[]) {
    if (sort && !groupBy.includes(sort.column) && !metricKeys.includes(sort.column)) {
      throw new BadRequestException('sort.column harus berupa kolom groupBy atau metric key yang tersedia.');
    }
  }

  private emptyBucket(groups: unknown[], metricCount: number): AggregateBucket {
    return {
      groups,
      count: 0,
      metrics: Array.from({ length: metricCount }, () => ({ count: 0, sum: 0, min: null, max: null, distinct: new Set<string>() })),
    };
  }

  private addMetric(state: AggregateBucket['metrics'][number], metric: AggregateMetric, row: DataRow, type?: ColumnType) {
    if (!metric.column) {
      state.count += 1;
      return;
    }
    const value = row[metric.column];
    if (!this.isPresent(value)) return;
    state.count += 1;
    state.distinct.add(this.keyOf(value, type));
    if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))) {
      const numericValue = Number(value);
      state.sum += numericValue;
      state.min = state.min === null ? numericValue : Math.min(state.min, numericValue);
      state.max = state.max === null ? numericValue : Math.max(state.max, numericValue);
    }
  }

  private metricValue(metric: AggregateMetric, state: AggregateBucket['metrics'][number]) {
    switch (metric.operation) {
      case AggregationOperation.Count: return state.count;
      case AggregationOperation.DistinctCount: return state.distinct.size;
      case AggregationOperation.Sum: return state.count ? state.sum : 0;
      case AggregationOperation.Average: return state.count ? state.sum / state.count : null;
      case AggregationOperation.Minimum: return state.min;
      case AggregationOperation.Maximum: return state.max;
    }
  }

  private matchesFilter(value: unknown, filter: FilterDto, type: ColumnType) {
    const empty = !this.isPresent(value);
    if (filter.operator === FilterOperator.IsNull) return (filter.value === false) ? !empty : empty;
    if (filter.operator === FilterOperator.In) {
      return !empty && (filter.value as unknown[]).some((candidate) => this.equals(value, candidate, type));
    }
    if (filter.operator === FilterOperator.Contains) return typeof value === 'string' && typeof filter.value === 'string'
      && value.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase());
    if (empty) return filter.operator === FilterOperator.NotEqual && this.isPresent(filter.value);
    const comparison = this.compare(this.normalize(value, type), this.normalize(filter.value, type), type);
    switch (filter.operator) {
      case FilterOperator.Equal: return comparison === 0;
      case FilterOperator.NotEqual: return comparison !== 0;
      case FilterOperator.GreaterThan: return comparison > 0;
      case FilterOperator.GreaterThanOrEqual: return comparison >= 0;
      case FilterOperator.LessThan: return comparison < 0;
      case FilterOperator.LessThanOrEqual: return comparison <= 0;
      default: return true;
    }
  }

  private equals(left: unknown, right: unknown, type: ColumnType) {
    return this.compare(this.normalize(left, type), this.normalize(right, type), type) === 0;
  }

  private normalize(value: unknown, type: ColumnType): unknown {
    if (type === 'number') return Number(value);
    if (type === 'date') return new Date(this.scalarString(value)).getTime();
    if (type === 'boolean' && typeof value === 'string') return value.toLowerCase() === 'true';
    return value;
  }

  private compare(left: unknown, right: unknown, type: ColumnType) {
    if (left === right) return 0;
    if (left === null || left === undefined) return -1;
    if (right === null || right === undefined) return 1;
    const a = this.normalize(left, type);
    const b = this.normalize(right, type);
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }

  private numeric(value: unknown) {
    const result = Number(value);
    if (!Number.isFinite(result)) throw new BadRequestException('Dataset berisi nilai numerik yang tidak valid untuk scatter chart.');
    return result;
  }

  private scalarString(value: unknown) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }

  private isPresent(value: unknown) {
    return value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');
  }

  private keyOf(value: unknown, type?: ColumnType) {
    const normalized = type ? this.normalize(value, type) : value;
    return `${typeof normalized}:${normalized instanceof Date ? normalized.toISOString() : String(normalized)}`;
  }

  private async findDataset(userId: string, datasetId: string): Promise<DatasetShape> {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, userId },
      select: { id: true, name: true, rowCount: true, columnCount: true, columns: true, columnMetadata: true, profiling: true },
    });
    if (!dataset) throw new NotFoundException('Dataset tidak ditemukan.');
    return dataset as DatasetShape;
  }

  private columnsOf(dataset: DatasetShape): ColumnMetadata[] {
    if (!Array.isArray(dataset.columnMetadata)) return [];
    return dataset.columnMetadata.filter((item): item is ColumnMetadata =>
      typeof item === 'object' && item !== null && 'name' in item && 'type' in item,
    );
  }

  private asObject(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private recommendations(columns: ColumnMetadata[]) {
    const recommendations: Array<{ chartType: ChartType; xAxis: string; yAxis: string; aggregation: AggregationOperation; reason: string }> = [];
    const numbers = columns.filter((column) => column.type === 'number');
    const categories = columns.filter((column) => column.type === 'category' || column.type === 'boolean');
    const dates = columns.filter((column) => column.type === 'date');
    for (const date of dates) for (const number of numbers) {
      recommendations.push({ chartType: ChartType.Line, xAxis: date.name, yAxis: number.name, aggregation: AggregationOperation.Average, reason: `Kolom tanggal ${date.name} dapat menunjukkan perubahan ${number.name} dari waktu ke waktu.` });
    }
    for (const category of categories) for (const number of numbers) {
      recommendations.push({ chartType: ChartType.Bar, xAxis: category.name, yAxis: number.name, aggregation: AggregationOperation.Average, reason: `Kolom kategori ${category.name} dapat membandingkan nilai ${number.name} antar kelompok.` });
      if (category.uniqueCount > 0 && category.uniqueCount <= MAX_CATEGORY_PIE_SLICES) {
        recommendations.push({ chartType: ChartType.Pie, xAxis: category.name, yAxis: number.name, aggregation: AggregationOperation.Sum, reason: `Kolom ${category.name} memiliki ${category.uniqueCount} kategori, sehingga proporsi ${number.name} masih mudah dibaca.` });
      }
    }
    for (let first = 0; first < numbers.length; first++) for (let second = first + 1; second < numbers.length; second++) {
      recommendations.push({ chartType: ChartType.Scatter, xAxis: numbers[first].name, yAxis: numbers[second].name, aggregation: AggregationOperation.Average, reason: `Dua kolom numerik ${numbers[first].name} dan ${numbers[second].name} dapat memperlihatkan hubungan antar nilai.` });
    }
    return recommendations.slice(0, 30);
  }

  private async *readRows(datasetId: string, rowCount: number): AsyncGenerator<DataRow> {
    for (let skip = 0; skip < rowCount; skip += ROW_PAGE_SIZE) {
      const rows = await this.prisma.datasetRow.findMany({
        where: { datasetId }, orderBy: { rowIndex: 'asc' }, skip, take: ROW_PAGE_SIZE,
        select: { values: true },
      });
      if (rows.length === 0) return;
      for (const row of rows) {
        if (typeof row.values === 'object' && row.values !== null && !Array.isArray(row.values)) yield row.values as DataRow;
      }
    }
  }

  private checkScanSize(rowCount: number) {
    if (rowCount > MAX_SCANNED_ROWS) {
      throw new PayloadTooLargeException(`Analisis dibatasi hingga ${MAX_SCANNED_ROWS} baris per request.`);
    }
  }
}
