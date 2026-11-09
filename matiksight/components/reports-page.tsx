"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Download, Ellipsis, FileBarChart2, LineChart, PieChart, Search, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import { chartTypes, formatDatasetValue } from "@/lib/data-utils";

const icons = { Bar: BarChart3, Line: LineChart, Area: LineChart, Pie: PieChart, Donut: PieChart, Scatter: BarChart3 };
type VisualizationDataResponse = { success: true; data: Record<string, unknown>[] };
type AggregateDataResponse = { success: true; data: { results: Record<string, unknown>[] } };

export function ReportsPage() {
  const router = useRouter();
  const { visualizations, datasets, removeVisualization, updateVisualization, notify } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua tipe");
  const visible = useMemo(() => visualizations.filter((item) => (!query || `${item.title} ${item.datasetName}`.toLowerCase().includes(query.toLowerCase())) && (filter === "Semua tipe" || item.chartType === filter)), [visualizations, query, filter]);
  const exportReport = async (item: (typeof visualizations)[number]) => {
    const dataset = datasets.find((entry) => entry.id === item.datasetId);
    if (!dataset) {
      notify(`Dataset untuk laporan “${item.title}” tidak lagi tersedia.`);
      return;
    }
    const xColumn = dataset.columns?.find((column) => column.key === item.xKey);
    const yColumn = dataset.columns?.find((column) => column.key === item.yKey);
    if (!xColumn) {
      notify(`Kolom sumbu X untuk laporan “${item.title}” tidak tersedia.`);
      return;
    }
    try {
      const countByCategory = item.aggregation === "count" && item.chartType !== "Scatter";
      const responseData: Record<string, unknown>[] = countByCategory
        ? (await apiRequest<AggregateDataResponse>(`/datasets/${encodeURIComponent(dataset.id)}/aggregate`, {
          method: "POST",
          body: {
            groupBy: [xColumn.name],
            metrics: [{ operation: "count" }],
            filters: item.filters ?? [],
            sort: { column: "metric_1", direction: "desc" },
            limit: 100,
          },
        })).data.results.map((row) => ({ ...row, value: row.metric_1 }))
        : (await apiRequest<VisualizationDataResponse>(`/datasets/${encodeURIComponent(dataset.id)}/visualizations/data`, {
          method: "POST",
          body: {
            chartType: item.chartType.toLowerCase(),
            xAxis: xColumn.name,
            yAxis: yColumn?.name ?? "",
            aggregation: item.aggregation,
            filters: item.filters ?? [],
            limit: 100,
          },
        })).data;
      if (!responseData.length) {
        notify(`Tidak ada hasil agregasi yang valid untuk laporan “${item.title}”.`);
        return;
      }
      const summary = responseData.map((row, index) => {
        const label = String(row[xColumn.name] ?? index + 1);
        const value = row.value ?? row[yColumn?.name ?? ""] ?? "";
        return `${label}\t${formatDatasetValue(value, yColumn)}`;
      }).join("\n");
      const blob = new Blob([
        `MatikSight — ${item.title}\nDataset: ${dataset.name}\nTipe visualisasi: ${item.chartType}\nAgregasi: ${item.aggregation}\nPeriode: ${item.period ?? "Semua Data"}\nSumbu X: ${xColumn.name}\nSumbu Y: ${yColumn?.name ?? "Jumlah baris"}\n\nHasil agregasi:\n${xColumn.name}\t${yColumn?.name ?? "Jumlah baris"}\n${summary}\n`,
      ], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${item.title.toLowerCase().replaceAll(" ", "-")}.txt`; link.click(); URL.revokeObjectURL(url);
      notify("Ringkasan laporan berhasil diunduh.");
    } catch (error) {
      notify(`Laporan gagal diekspor: ${error instanceof Error ? error.message : "Kesalahan API."}`);
    }
  };
  const rename = async (id: string, current: string) => {
    const value = window.prompt("Nama visualisasi baru", current);
    if (!value?.trim()) return;
    try {
      await updateVisualization(id, { title: value.trim() });
      notify("Nama visualisasi diperbarui.");
    } catch (error) {
      notify(`Nama visualisasi gagal diperbarui: ${error instanceof Error ? error.message : "Kesalahan API."}`);
    }
  };
  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Hapus “${title}” dari laporan tersimpan?`)) return;
    try {
      await removeVisualization(id);
      notify("Visualisasi dihapus.");
    } catch (error) {
      notify(`Visualisasi gagal dihapus: ${error instanceof Error ? error.message : "Kesalahan API."}`);
    }
  };

  return <div className="page-content"><PageHeader title="Laporan" description="Kelola dan akses hasil analisis data Anda." action={<button className="button button-primary" onClick={() => router.push("/visualization")}><BarChart3 size={16} /> Buat Visualisasi</button>} />
    <Panel className="reports-panel"><PanelHeading title="Visualisasi tersimpan" subtitle={`${visualizations.length} visualisasi di workspace Anda`} /><div className="list-toolbar"><label className="table-search"><Search size={15} /><input placeholder="Cari laporan..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><SelectField value={filter} options={["Semua tipe", ...chartTypes]} onChange={setFilter} label="Filter tipe grafik" /></div>
      {visible.length ? <div className="report-list">{visible.map((item) => { const Icon = icons[item.chartType]; const datasetAvailable = datasets.some((dataset) => dataset.id === item.datasetId); return <article className="report-row" key={item.id}><span className="report-icon"><Icon size={20} /></span><div className="report-title"><strong>{item.title}</strong><small>{item.datasetName}</small></div><span className="report-type">{item.chartType} Chart · {item.aggregation}</span><span className="report-date">Dibuat {item.createdAt}</span><div className="report-actions"><button title={datasetAvailable ? "Ekspor laporan" : "Dataset tidak tersedia"} disabled={!datasetAvailable} onClick={() => void exportReport(item)}><Download size={16} /></button><button title="Ganti nama" onClick={() => void rename(item.id, item.title)}><Ellipsis size={17} /></button><button title="Hapus laporan" onClick={() => void remove(item.id, item.title)}><Trash2 size={15} /></button></div></article>; })}</div> : <div className="empty-state"><span><FileBarChart2 size={24} /></span><h3>{visualizations.length ? "Tidak ada hasil" : "Belum ada laporan tersimpan"}</h3><p>{visualizations.length ? "Coba ubah kata pencarian atau tipe grafik." : "Simpan visualisasi pertama Anda dari studio untuk melihatnya di sini."}</p><button className="button button-primary button-small" onClick={() => router.push("/visualization")}>Buka Studio</button></div>}
    </Panel>
  </div>;
}
