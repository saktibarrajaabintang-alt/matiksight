export type SalesRow = {
  id: number;
  tanggal: string;
  produk: string;
  kategori: string;
  jumlah: number;
  harga: number;
  total: number;
};

export type Dataset = {
  id: string;
  name: string;
  size: number;
  type: "Excel" | "CSV" | "Foto Tabel";
  rows: number;
  data?: SalesRow[];
  uploadedAt: string;
  createdAt?: string;
  status: "Belum diproses" | "Selesai" | "Diproses" | "Gagal";
};

export type Visualization = {
  id: string;
  title: string;
  datasetName: string;
  chartType: ChartType;
  xKey: keyof SalesRow;
  yKey: keyof SalesRow;
  createdAt: string;
};

export type ChartType = "Bar" | "Line" | "Area" | "Pie" | "Donut" | "Scatter";
export type DateRange = "7 Hari Terakhir" | "30 Hari Terakhir" | "90 Hari Terakhir" | "12 Bulan Terakhir";

export const chartTypes: ChartType[] = ["Bar", "Line", "Area", "Pie", "Donut", "Scatter"];
export const dateRanges: DateRange[] = ["7 Hari Terakhir", "30 Hari Terakhir", "90 Hari Terakhir", "12 Bulan Terakhir"];
export const chartColors = ["#159edb", "#48c4e9", "#6a82db", "#a9c8e8", "#16a579"];

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export const formatNumber = (value: number) => new Intl.NumberFormat("id-ID").format(value);

export function summarizeCategories(rows: SalesRow[]) {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.kategori] = (acc[row.kategori] ?? 0) + row.total;
    return acc;
  }, {});
  const sum = Object.values(totals).reduce((total, value) => total + value, 0) || 1;
  return Object.entries(totals).map(([name, value]) => ({ name, value, percent: Math.round((value / sum) * 1000) / 10 }));
}

export function downloadCsv(rows: SalesRow[], filename = "matiksight-data.csv") {
  const header = ["No", "Tanggal", "Produk", "Kategori", "Jumlah", "Harga Satuan", "Total"];
  const lines = rows.map((row) => [row.id, row.tanggal, row.produk, row.kategori, row.jumlah, row.harga, row.total]);
  const csv = [header, ...lines].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
