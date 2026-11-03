import {
  AggregationOperation,
  AggregationResponse,
  ChartRecommendation,
  ChartType,
  Dataset,
  DatasetColumn,
  DatasetColumnType,
  DatasetPreview,
  DatasetProfile,
  DatasetRecord,
  getCellValue,
  getNumericValue,
  isMissingValue,
} from "@/lib/data-utils";

const numericTypes = new Set<DatasetColumnType>(["integer", "decimal", "currency", "percentage"]);
const dimensions = new Set<DatasetColumnType>(["string", "date", "datetime", "time", "boolean"]);
const categoricalTypes = new Set<DatasetColumnType>(["string", "time", "boolean"]);

export function isNumericColumn(column: DatasetColumn) {
  return numericTypes.has(column.type);
}

function isDateValue(value: unknown): value is Date | string {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== "string" || !value.trim()) return false;
  return /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s].*)?$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function dateValue(value: unknown) {
  return value instanceof Date ? value : new Date(String(value));
}

export function inferColumnType(values: unknown[]): DatasetColumnType {
  const nonEmpty = values.filter((value) => !isMissingValue(value));
  if (!nonEmpty.length) return "string";
  if (nonEmpty.every((value) => typeof value === "boolean")) return "boolean";
  if (nonEmpty.every((value) => value instanceof Date)) {
    return nonEmpty.every((value) => (value as Date).getHours() === 0 && (value as Date).getMinutes() === 0)
      ? "date"
      : "datetime";
  }
  if (nonEmpty.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return nonEmpty.every((value) => Number.isInteger(value)) ? "integer" : "decimal";
  }
  if (nonEmpty.every((value) => typeof value === "string" && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(value.trim()))) return "time";
  if (nonEmpty.every(isDateValue)) {
    return nonEmpty.some((value) => typeof value === "string" && value.includes("T")) ? "datetime" : "date";
  }
  if (nonEmpty.every((value) => typeof value === "string" && getNumericValue(value) !== undefined)) {
    return nonEmpty.every((value) => Number.isInteger(Number(value))) ? "integer" : "decimal";
  }
  if (nonEmpty.every((value) => typeof value === "string" && /^[+-]?(?:\d+\.?\d*|\.\d+)%$/.test(value.trim()))) return "percentage";
  return "string";
}

export function buildDatasetColumns(headers: string[], rows: DatasetRecord[]): DatasetColumn[] {
  return headers.map((name, index) => {
    const values = rows.map((row) => row[index]);
    return {
      key: String(index),
      name,
      type: inferColumnType(values),
      missingValues: values.filter(isMissingValue).length,
    };
  });
}

export function buildDatasetProfile(columns: DatasetColumn[], rows: DatasetRecord[]): DatasetProfile {
  const numericColumns = columns.filter(isNumericColumn).map((column) => {
    const values = rows
      .map((row) => getNumericValue(getCellValue(row, column), column.type))
      .filter((value): value is number => value !== undefined);
    const sum = values.reduce((total, value) => total + value, 0);
    return {
      columnKey: column.key,
      minimum: values.reduce((minimum, value) => Math.min(minimum, value), values[0] ?? 0),
      maximum: values.reduce((maximum, value) => Math.max(maximum, value), values[0] ?? 0),
      average: values.length ? sum / values.length : 0,
      sum,
    };
  });
  const categoricalColumns = columns
    .filter((column) => categoricalTypes.has(column.type))
    .map((column) => {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const value = getCellValue(row, column);
        if (isMissingValue(value)) continue;
        const label = String(value);
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      return {
        columnKey: column.key,
        distinctValues: counts.size,
        topValues: [...counts.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value, count })),
      };
    });
  const dateRanges = columns
    .filter((column) => column.type === "date" || column.type === "datetime")
    .flatMap((column) => {
      const dates = rows
        .map((row) => getCellValue(row, column))
        .filter(isDateValue)
        .map(dateValue)
        .filter((value) => !Number.isNaN(value.getTime()))
        .sort((left, right) => left.getTime() - right.getTime());
      if (!dates.length) return [];
      return [{
        columnKey: column.key,
        start: dates[0].toISOString(),
        end: dates[dates.length - 1].toISOString(),
      }];
    });

  return {
    rowCount: rows.length,
    columnCount: columns.length,
    missingValues: rows.reduce(
      (total, row) => total + columns.filter((column) => isMissingValue(getCellValue(row, column))).length,
      0,
    ),
    numericColumns,
    categoricalColumns,
    dateRanges,
  };
}

export function recommendCharts(dataset: Dataset): ChartRecommendation[] {
  const columns = dataset.columns ?? [];
  const xColumns = columns.filter((column) => dimensions.has(column.type));
  const numericColumns = columns.filter(isNumericColumn);
  const cardinality = new Map(xColumns.map((column) => [
    column.key,
    new Set((dataset.data ?? []).map((row) => String(getCellValue(row, column))).filter((value) => value !== "" && value !== "null")).size,
  ]));
  const usefulDimensions = xColumns
    .filter((column) => {
      const distinct = cardinality.get(column.key) ?? 0;
      return column.type === "date" || column.type === "datetime"
        || (distinct > 1 && distinct < dataset.rows && distinct <= 50);
    })
    .toSorted((left, right) => {
      const dateOrder = Number(left.type === "date" || left.type === "datetime")
        - Number(right.type === "date" || right.type === "datetime");
      return dateOrder || (cardinality.get(left.key) ?? 0) - (cardinality.get(right.key) ?? 0);
    });
  const recommendedDimensions = usefulDimensions.length ? usefulDimensions : xColumns;
  const recommendations: ChartRecommendation[] = [];

  for (const xColumn of recommendedDimensions) {
    const yColumn = numericColumns[0];
    if (yColumn) {
      recommendations.push({
        title: `${yColumn.name} by ${xColumn.name}`,
        datasetId: dataset.id,
        chartType: xColumn.type === "date" || xColumn.type === "datetime" ? "Line" : "Bar",
        xKey: xColumn.key,
        yKey: yColumn.key,
        aggregation: "sum",
        description: `Compare ${yColumn.name} across ${xColumn.name}.`,
      });
    } else {
      recommendations.push({
        title: `Count by ${xColumn.name}`,
        datasetId: dataset.id,
        chartType: "Bar",
        xKey: xColumn.key,
        yKey: "",
        aggregation: "count",
        description: `Count records for each ${xColumn.name}.`,
      });
    }
  }

  return recommendations.slice(0, 3);
}

function formatGroupValue(value: unknown, column: DatasetColumn) {
  if ((column.type === "date" || column.type === "datetime") && (value instanceof Date || typeof value === "string")) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return column.type === "date"
        ? date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        : date.toLocaleString("id-ID");
    }
  }
  return String(value);
}

export function aggregateDataset(
  dataset: Dataset,
  configuration: Pick<ChartRecommendation, "xKey" | "yKey" | "aggregation" | "chartType" | "period">,
): AggregationResponse {
  const columns = dataset.columns ?? [];
  const xColumn = columns.find((column) => column.key === configuration.xKey);
  const yColumn = columns.find((column) => column.key === configuration.yKey);
  const scatter = configuration.chartType === "Scatter";
  const validX = xColumn && (scatter ? isNumericColumn(xColumn) : dimensions.has(xColumn.type));
  const validY = configuration.aggregation === "count" || (yColumn && isNumericColumn(yColumn));
  if (!validX || !validY || !dataset.data) {
    return { data: [], groupCount: 0, skippedRows: 0, skippedValues: 0 };
  }

  let rowsToAggregate = dataset.data;
  const dateColumn = columns.find((column) => column.type === "date" || column.type === "datetime");
  if (dateColumn && configuration.period && configuration.period !== "Semua Data") {
    const days = configuration.period === "7 Hari" ? 7 : configuration.period === "30 Hari" ? 30 : 365;
    const timestamps = dataset.data
      .map((row) => {
        const value = getCellValue(row, dateColumn);
        return isDateValue(value) ? dateValue(value).getTime() : Number.NaN;
      })
      .filter(Number.isFinite);
    if (timestamps.length) {
      const latest = timestamps.reduce((maximum, value) => Math.max(maximum, value), timestamps[0]);
      const cutoff = latest - days * 24 * 60 * 60 * 1000;
      rowsToAggregate = dataset.data.filter((row) => {
        const value = getCellValue(row, dateColumn);
        const timestamp = isDateValue(value) ? dateValue(value).getTime() : Number.NaN;
        return Number.isFinite(timestamp) && timestamp >= cutoff;
      });
    }
  }

  const groups = new Map<string, { name: string; x: number; values: number[]; count: number }>();
  let skippedRows = 0;
  let skippedValues = 0;
  for (const row of rowsToAggregate) {
    const rawX = getCellValue(row, xColumn);
    if (isMissingValue(rawX)) {
      skippedRows += 1;
      continue;
    }
    const numericX = scatter ? getNumericValue(rawX, xColumn.type) : undefined;
    if (scatter && numericX === undefined) {
      skippedRows += 1;
      continue;
    }
    const name = formatGroupValue(rawX, xColumn);
    const key = scatter ? String(numericX) : name;
    const dateX = xColumn.type === "date" || xColumn.type === "datetime" ? dateValue(rawX).getTime() : 0;
    const group = groups.get(key) ?? { name, x: numericX ?? dateX, values: [], count: 0 };
    group.count += 1;

    if (configuration.aggregation !== "count") {
      const numericY = yColumn ? getNumericValue(getCellValue(row, yColumn), yColumn.type) : undefined;
      if (numericY === undefined) skippedValues += 1;
      else group.values.push(numericY);
    }
    groups.set(key, group);
  }

  const data = [...groups.values()].flatMap((group) => {
    if (configuration.aggregation !== "count" && !group.values.length) return [];
    const sum = group.values.reduce((total, value) => total + value, 0);
    const value = configuration.aggregation === "count"
      ? group.count
      : configuration.aggregation === "average"
        ? sum / group.values.length
        : configuration.aggregation === "minimum"
          ? group.values.reduce((minimum, current) => Math.min(minimum, current), group.values[0])
          : configuration.aggregation === "maximum"
            ? group.values.reduce((maximum, current) => Math.max(maximum, current), group.values[0])
            : sum;
    return [{ name: group.name, value, x: group.x }];
  });

  if (xColumn.type === "date" || xColumn.type === "datetime") data.sort((left, right) => left.x - right.x);
  return { data, groupCount: groups.size, skippedRows, skippedValues };
}

export function isNumericChartType(chartType: ChartType) {
  return chartType === "Scatter";
}

export function isDimension(column: DatasetColumn) {
  return dimensions.has(column.type);
}

export function getDatasetPreview(dataset: Dataset): DatasetPreview {
  const rows = dataset.data ?? [];
  return {
    datasetId: dataset.id,
    columns: dataset.columns ?? [],
    rows,
    totalRows: rows.length,
  };
}

export function getAggregationLabel(operation: AggregationOperation) {
  return operation === "average" ? "Average"
    : operation === "minimum" ? "Minimum"
      : operation === "maximum" ? "Maximum"
        : operation === "count" ? "Count" : "Sum";
}
