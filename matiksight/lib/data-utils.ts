export type DatasetColumnType =
  | "string"
  | "integer"
  | "decimal"
  | "currency"
  | "percentage"
  | "date"
  | "datetime"
  | "time"
  | "boolean";

export type DatasetRecord = unknown[];

export type DatasetColumn = {
  key: string;
  name: string;
  type: DatasetColumnType;
  missingValues: number;
  currencyCode?: string;
};

export type NumericColumnStatistics = {
  columnKey: string;
  minimum: number;
  maximum: number;
  average: number;
  sum: number;
};

export type CategoricalColumnStatistics = {
  columnKey: string;
  distinctValues: number;
  topValues: { value: string; count: number }[];
};

export type DatasetProfile = {
  rowCount: number;
  columnCount: number;
  missingValues: number;
  numericColumns: NumericColumnStatistics[];
  categoricalColumns: CategoricalColumnStatistics[];
  dateRanges: { columnKey: string; start: string; end: string }[];
};

export type DatasetPreview = {
  datasetId: string;
  columns: DatasetColumn[];
  rows: DatasetRecord[];
  totalRows: number;
};

export type Dataset = {
  id: string;
  name: string;
  size: number;
  type: "Excel" | "CSV" | "Foto Tabel";
  rows: number;
  data?: DatasetRecord[];
  columns?: DatasetColumn[];
  profile?: DatasetProfile;
  sheetName?: string;
  uploadedAt: string;
  createdAt?: string;
  status: "Belum diproses" | "Selesai" | "Diproses" | "Gagal";
};

export type ChartType = "Bar" | "Line" | "Area" | "Pie" | "Donut" | "Scatter";
export type AggregationOperation = "sum" | "average" | "count" | "minimum" | "maximum";
export type ChartPeriod = "Semua Data" | "7 Hari" | "30 Hari" | "12 Bulan";

export type ChartConfiguration = {
  title: string;
  datasetId: string;
  chartType: ChartType;
  xKey: string;
  yKey: string;
  aggregation: AggregationOperation;
  period?: ChartPeriod;
};

export type Visualization = ChartConfiguration & {
  id: string;
  datasetName: string;
  createdAt: string;
  filters?: { column: string; operator: string; value?: unknown }[];
};

export type ChartRecommendation = ChartConfiguration & {
  description: string;
};

export type AggregationResponse = {
  data: { name: string; value: number; x: number }[];
  groupCount: number;
  skippedRows: number;
  skippedValues: number;
};

export type APIError = {
  message: string;
  status?: number;
  code?: string;
};

export type ParsedDataset = Omit<DatasetPreview, "datasetId"> & {
  profile: DatasetProfile;
  sheetName?: string;
};

export type DateRange = "7 Hari Terakhir" | "30 Hari Terakhir" | "90 Hari Terakhir" | "12 Bulan Terakhir";

export const chartTypes: ChartType[] = ["Bar", "Line", "Area", "Pie", "Donut", "Scatter"];
export const dateRanges: DateRange[] = ["7 Hari Terakhir", "30 Hari Terakhir", "90 Hari Terakhir", "12 Bulan Terakhir"];
export const chartColors = ["#159edb", "#48c4e9", "#6a82db", "#a9c8e8", "#16a579"];

export const aggregationOptions: { value: AggregationOperation; label: string }[] = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "count", label: "Count" },
  { value: "minimum", label: "Minimum" },
  { value: "maximum", label: "Maximum" },
];

export const formatNumber = (value: number) => new Intl.NumberFormat("id-ID").format(value);

export function isMissingValue(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

export function getColumnIndex(column: DatasetColumn) {
  return Number(column.key);
}

export function getCellValue(row: DatasetRecord, column: DatasetColumn) {
  return row[getColumnIndex(column)];
}

export function getNumericValue(value: unknown, type?: DatasetColumnType): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || isMissingValue(value)) return undefined;
  const text = value.trim();
  const numericText = type === "percentage" ? text.replace(/%$/, "").trim() : text;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(numericText)) return undefined;
  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatDatasetValue(value: unknown, column?: DatasetColumn): string {
  if (isMissingValue(value)) return "—";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString("id-ID");
  }
  if (!column) return String(value);
  if (column.type === "date" || column.type === "datetime") {
    const date = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return column.type === "date"
        ? date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        : date.toLocaleString("id-ID");
    }
  }
  if (column.type === "time") return String(value);
  const numeric = getNumericValue(value, column.type);
  if (numeric !== undefined) {
    if (column.type === "currency") {
      if (!column.currencyCode) return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 }).format(numeric);
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: column.currencyCode, maximumFractionDigits: 2 }).format(numeric);
    }
    if (column.type === "percentage") return `${formatNumber(numeric)}%`;
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 }).format(numeric);
  }
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
}

export function downloadCsv(
  rows: DatasetRecord[],
  columns: DatasetColumn[],
  filename = "matiksight-data.csv",
) {
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const header = columns.map((column) => escape(column.name)).join(",");
  const lines = rows.map((row) => columns.map((column) => {
    const value = row[getColumnIndex(column)];
    const exportValue = value instanceof Date && column.type === "date"
      ? new Intl.DateTimeFormat("sv-SE").format(value)
      : value;
    return escape(exportValue);
  }).join(","));
  const csv = [header, ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
