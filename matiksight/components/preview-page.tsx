"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, Download, FileSpreadsheet, Hash, Rows3, Type } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, PanelHeading, StatusBadge } from "@/components/ui";
import { downloadCsv, formatNumber, formatRupiah } from "@/lib/data-utils";

export function PreviewPage() {
  const { currentDataset, rows, notify } = useApp();
  const columns = rows[0] ? Object.entries(rows[0]) : [];
  const numericCount = columns.filter(([, value]) => typeof value === "number").length;
  const textCount = columns.length - numericCount;
  if (!currentDataset) {
    return <div className="page-content"><PageHeader title="Data Preview" description="Periksa struktur dan isi data sebelum membuat visualisasi." /><Panel className="empty-state"><span><FileSpreadsheet size={24} /></span><h3>Belum ada dataset</h3><p>Unggah file untuk menambahkannya ke workspace.</p><Link className="button button-primary button-small" href="/upload"><ArrowRight size={14} /> Upload Data</Link></Panel></div>;
  }
  return <div className="page-content">
    <PageHeader title="Data Preview" description="Periksa struktur dan isi data sebelum membuat visualisasi." action={<Link className="button button-outline" href="/upload"><ArrowLeft size={15} /> Upload Data Baru</Link>} />
    <Panel className="dataset-summary"><div className="dataset-summary-file"><span className="file-icon large"><FileSpreadsheet size={22} /></span><div><h2>{currentDataset.name}</h2><p>{currentDataset.type} <span>•</span> Diunggah {currentDataset.uploadedAt}</p></div></div><div className="dataset-summary-status"><StatusBadge>{currentDataset.status}</StatusBadge><small><Clock3 size={13} /> Diperbarui hari ini</small></div></Panel>
    <div className="preview-metrics">{[{ label: "Total Baris", value: formatNumber(rows.length), icon: Rows3 }, { label: "Total Kolom", value: formatNumber(columns.length), icon: Hash }, { label: "Kolom Numerik", value: formatNumber(numericCount), icon: Hash }, { label: "Kolom Teks", value: formatNumber(textCount), icon: Type }].map(({ label, value, icon: Icon }) => <Panel key={label} className="preview-metric"><span className="preview-metric-icon"><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong></div></Panel>)}</div>
    <Panel className="columns-panel"><PanelHeading title="Struktur Kolom" subtitle="Tipe data yang ditemukan dalam dataset" />{columns.length ? <div className="column-list">{columns.map(([name, value]) => <div className="column-item" key={name}><div className="column-name"><span>{typeof value === "number" ? <Hash size={14} /> : <Type size={14} />}</span><strong>{name}</strong><small>{typeof value === "number" ? "Number" : "Text"}</small></div><span className="column-sample">{typeof value === "number" ? formatRupiah(value) : String(value)}</span></div>)}</div> : <p className="table-empty">Belum ada struktur kolom. Isi file belum dibaca.</p>}</Panel>
    <Panel className="preview-table-panel"><PanelHeading title="Pratinjau Data" subtitle={`Menampilkan ${formatNumber(rows.length)} baris data`} action={<button className="button button-outline button-small" disabled={!rows.length} onClick={() => { downloadCsv(rows, currentDataset.name.replace(/\.[^.]+$/, ".csv")); notify("CSV berhasil diunduh."); }}><Download size={14} /> Download CSV</button>} /><DataTable rows={rows} pageSize={8} /></Panel>
    <div className="preview-footer"><span><Clock3 size={15} /> Isi file belum diproses</span><Link className="button button-primary" href="/visualization">Buka Visualisasi <ArrowRight size={16} /></Link></div>
  </div>;
}
