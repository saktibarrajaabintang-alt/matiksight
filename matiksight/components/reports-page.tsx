"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Download, Ellipsis, FileBarChart2, LineChart, PieChart, Search, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";
import { chartTypes, ChartType } from "@/lib/data-utils";

const icons = { Bar: BarChart3, Line: LineChart, Area: LineChart, Pie: PieChart, Donut: PieChart, Scatter: BarChart3 };

export function ReportsPage() {
  const router = useRouter();
  const { visualizations, reports, removeVisualization, updateVisualization, removeReport, saveReport, notify } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua tipe");
  const visible = useMemo(() => visualizations.filter((item) => (!query || `${item.title} ${item.datasetName}`.toLowerCase().includes(query.toLowerCase())) && (filter === "Semua tipe" || item.chartType === filter)), [visualizations, query, filter]);
  const exportReport = async (title: string, type: ChartType, dataset: string, datasetId: string) => {
    try {
      await saveReport(datasetId, title, { chartType: type, datasetName: dataset }, { generatedAt: new Date().toISOString() });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Laporan gagal disimpan.");
      return;
    }
    const blob = new Blob([`MatikSight — ${title}\nDataset: ${dataset}\nTipe visualisasi: ${type}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `${title.toLowerCase().replaceAll(" ", "-")}.txt`; link.click(); URL.revokeObjectURL(url);
    notify("Ringkasan laporan berhasil diunduh.");
  };
  const rename = async (id: string, current: string) => {
    const value = window.prompt("Nama visualisasi baru", current);
    if (value?.trim()) {
      try { await updateVisualization(id, { title: value.trim() }); notify("Nama visualisasi diperbarui."); }
      catch (reason) { notify(reason instanceof Error ? reason.message : "Nama visualisasi gagal diperbarui."); }
    }
  };
  const remove = async (id: string, title: string) => {
    if (window.confirm(`Hapus “${title}” dari laporan tersimpan?`)) {
      try { await removeVisualization(id); notify("Visualisasi dihapus."); }
      catch (reason) { notify(reason instanceof Error ? reason.message : "Visualisasi gagal dihapus."); }
    }
  };
  const removeSavedReport = async (id: string, title: string) => {
    if (!window.confirm(`Hapus laporan “${title}”?`)) return;
    try { await removeReport(id); notify("Laporan dihapus."); }
    catch (reason) { notify(reason instanceof Error ? reason.message : "Laporan gagal dihapus."); }
  };

  return <div className="page-content"><PageHeader title="Laporan" description="Kelola dan akses hasil analisis data Anda." action={<button className="button button-primary" onClick={() => router.push("/visualization")}><BarChart3 size={16} /> Buat Visualisasi</button>} />
    <Panel className="reports-panel"><PanelHeading title="Visualisasi tersimpan" subtitle={`${visualizations.length} visualisasi di akun Anda`} /><div className="list-toolbar"><label className="table-search"><Search size={15} /><input placeholder="Cari laporan..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><SelectField value={filter} options={["Semua tipe", ...chartTypes]} onChange={setFilter} label="Filter tipe grafik" /></div>
      {visible.length ? <div className="report-list">{visible.map((item) => { const Icon = icons[item.chartType]; return <article className="report-row" key={item.id}><span className="report-icon"><Icon size={20} /></span><div className="report-title"><strong>{item.title}</strong><small>{item.datasetName}</small></div><span className="report-type">{item.chartType} Chart</span><span className="report-date">Dibuat {item.createdAt}</span><div className="report-actions"><button title="Ekspor dan simpan laporan" onClick={() => void exportReport(item.title, item.chartType, item.datasetName, item.datasetId)}><Download size={16} /></button><button title="Ganti nama" onClick={() => void rename(item.id, item.title)}><Ellipsis size={17} /></button><button title="Hapus visualisasi" onClick={() => void remove(item.id, item.title)}><Trash2 size={15} /></button></div></article>; })}</div> : <div className="empty-state"><span><FileBarChart2 size={24} /></span><h3>{visualizations.length ? "Tidak ada hasil" : "Belum ada visualisasi tersimpan"}</h3><p>{visualizations.length ? "Coba ubah kata pencarian atau tipe grafik." : "Simpan visualisasi pertama Anda dari studio untuk melihatnya di sini."}</p><button className="button button-primary button-small" onClick={() => router.push("/visualization")}>Buka Studio</button></div>}
    </Panel>
    <Panel className="reports-panel"><PanelHeading title="Laporan tersimpan" subtitle={`${reports.length} laporan tersimpan di database`} />
      {reports.length ? <div className="report-list">{reports.map((report) => <article className="report-row" key={report.id}><span className="report-icon"><FileBarChart2 size={20} /></span><div className="report-title"><strong>{report.title}</strong><small>{report.description || "Laporan analisis"}</small></div><span className="report-date">Dibuat {report.createdAt}</span><div className="report-actions"><button title="Hapus laporan" onClick={() => void removeSavedReport(report.id, report.title)}><Trash2 size={15} /></button></div></article>)}</div> : <p className="table-empty">Belum ada laporan yang disimpan.</p>}
    </Panel>
  </div>;
}
