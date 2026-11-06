import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DatasetAnalysisService } from './dataset-analysis.service';
import { AggregationOperation, ChartType } from './dto/analysis-request.dto';

describe('DatasetAnalysisService', () => {
  const storedRows = [
    { region: 'North', amount: 10, cost: 5, day: '2026-01-01' },
    { region: 'South', amount: 20, cost: 10, day: '2026-01-02' },
    { region: 'North', amount: 30, cost: 15, day: '2026-01-03' },
  ];
  let prisma: any;
  let service: DatasetAnalysisService;

  beforeEach(() => {
    const dataset = {
      id: '10000000-0000-4000-8000-000000000001',
      userId: '00000000-0000-4000-8000-000000000001',
      name: 'custom',
      rowCount: storedRows.length,
      columnCount: 5,
      columns: ['region', 'amount', 'cost', 'day', 'notes'],
      columnMetadata: [
        { name: 'region', type: 'category', nullable: false, uniqueCount: 2, nullCount: 0 },
        { name: 'amount', type: 'number', nullable: false, uniqueCount: 3, nullCount: 0, min: 10, max: 30, mean: 20 },
        { name: 'cost', type: 'number', nullable: false, uniqueCount: 3, nullCount: 0, min: 5, max: 15, mean: 10 },
        { name: 'day', type: 'date', nullable: false, uniqueCount: 3, nullCount: 0, min: '2026-01-01T00:00:00.000Z', max: '2026-01-03T00:00:00.000Z' },
        { name: 'notes', type: 'mixed', nullable: true, uniqueCount: 2, nullCount: 1 },
      ],
      profiling: { dateRange: [{ column: 'day', min: '2026-01-01T00:00:00.000Z', max: '2026-01-03T00:00:00.000Z' }], dataQuality: { score: 100, missingValues: 0, duplicateRows: 0 } },
    };
    prisma = {
      dataset: { findFirst: jest.fn(async ({ where }: any) => where.userId === dataset.userId ? dataset : null) },
      datasetRow: {
        findMany: jest.fn(async ({ skip, take }: any) => storedRows.slice(skip, skip + take).map((values) => ({ values }))),
      },
    };
    service = new DatasetAnalysisService(prisma);
  });

  it('summarizes numeric, categorical, and date metadata and recommends charts dynamically', async () => {
    const response = await service.analysis('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');
    expect(response.data.overview).toMatchObject({ totalRows: 3, totalColumns: 5 });
    expect(response.data.columnTypes).toEqual({ category: 1, number: 2, date: 1, mixed: 1 });
    expect(response.data.numericStatistics[0]).toMatchObject({ name: 'amount', min: 10, max: 30, mean: 20 });
    expect(response.data.categoricalSummary[0]).toMatchObject({ name: 'region', uniqueCount: 2 });
    expect(response.data.dateRange).toHaveLength(1);
    expect(response.data.recommendations.map((item) => item.chartType)).toEqual(expect.arrayContaining([ChartType.Line, ChartType.Bar, ChartType.Pie]));
    expect(response.data.recommendations.every((item) => item.reason.length > 0)).toBe(true);
  });

  it('aggregates across a dataset without groupBy', async () => {
    const response = await service.aggregate('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      metrics: [{ column: 'amount', operation: AggregationOperation.Sum }, { column: 'amount', operation: AggregationOperation.Average }],
    });
    expect(response.data.results).toEqual([{ metric_1: 60, metric_2: 20 }]);
  });

  it('supports count, minimum, maximum, and distinct count', async () => {
    const response = await service.aggregate('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      metrics: [
        { column: 'amount', operation: AggregationOperation.Count },
        { column: 'amount', operation: AggregationOperation.Minimum },
        { column: 'amount', operation: AggregationOperation.Maximum },
        { column: 'region', operation: AggregationOperation.DistinctCount },
      ],
    });
    expect(response.data.results).toEqual([{ metric_1: 3, metric_2: 10, metric_3: 30, metric_4: 2 }]);
  });

  it('groups, filters, and sorts aggregation output', async () => {
    const response = await service.aggregate('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      groupBy: ['region'],
      metrics: [{ column: 'amount', operation: AggregationOperation.Sum }, { operation: AggregationOperation.Count }],
      filters: [{ column: 'amount', operator: 'gte' as any, value: 20 }],
      sort: { column: 'metric_1', direction: 'desc' },
      limit: 10,
    });
    expect(response.data.results).toEqual([
      { region: 'North', metric_1: 30, metric_2: 1 },
      { region: 'South', metric_1: 20, metric_2: 1 },
    ]);
  });

  it('returns grouped Recharts data and supports scatter rows', async () => {
    const bar = await service.visualizationData('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      chartType: ChartType.Bar, xAxis: 'region', yAxis: 'amount', aggregation: AggregationOperation.Average,
    });
    expect(bar.data).toEqual([{ region: 'North', value: 20 }, { region: 'South', value: 20 }]);
    const scatter = await service.visualizationData('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      chartType: ChartType.Scatter, xAxis: 'amount', yAxis: 'cost',
    });
    expect(scatter.data).toEqual([{ amount: 10, cost: 5 }, { amount: 20, cost: 10 }, { amount: 30, cost: 15 }]);
    const donut = await service.visualizationData('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      chartType: ChartType.Donut, xAxis: 'region', yAxis: 'amount', aggregation: AggregationOperation.Sum,
    });
    expect(donut.chart.type).toBe(ChartType.Donut);
    expect(donut.data).toEqual([{ region: 'North', value: 40 }, { region: 'South', value: 20 }]);
  });

  it('rejects invalid columns, unsupported metric types, incompatible charts, and foreign datasets', async () => {
    await expect(service.aggregate('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      metrics: [{ column: 'missing', operation: AggregationOperation.Sum }],
    })).rejects.toThrow(BadRequestException);
    await expect(service.aggregate('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      metrics: [{ column: 'region', operation: AggregationOperation.Sum }],
    })).rejects.toThrow(BadRequestException);
    await expect(service.visualizationData('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      chartType: ChartType.Scatter, xAxis: 'region', yAxis: 'amount',
    })).rejects.toThrow(BadRequestException);
    await expect(service.analysis('another-user', '10000000-0000-4000-8000-000000000001')).rejects.toThrow(NotFoundException);
  });

  it('returns an empty summary and identity aggregates for an empty dataset', async () => {
    const originalFindFirst = prisma.dataset.findFirst;
    prisma.dataset.findFirst = jest.fn(async () => ({
      id: '10000000-0000-4000-8000-000000000001', name: 'empty', rowCount: 0, columnCount: 1,
      columns: ['amount'], columnMetadata: [{ name: 'amount', type: 'number', nullable: false, uniqueCount: 0, nullCount: 0 }],
      profiling: { dataQuality: { score: 100, missingValues: 0, duplicateRows: 0 }, dateRange: [] },
    }));
    const response = await service.aggregate('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', {
      metrics: [{ operation: AggregationOperation.Count }, { column: 'amount', operation: AggregationOperation.Average }],
    });
    expect(response.data.results).toEqual([{ metric_1: 0, metric_2: null }]);
    prisma.dataset.findFirst = originalFindFirst;
  });
});
