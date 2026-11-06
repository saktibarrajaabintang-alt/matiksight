"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, Download, FileSpreadsheet, Hash, Rows3, Type } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, PanelHeading, StatusBadge } from "@/components/ui";
import {
  DatasetColumn,
  downloadCsv,
  formatDatasetValue,
  formatNumber,
  getCellValue,
} from "@/lib/data-utils";
import { getDatasetPreview, isNumericColumn } from "@/lib/dataset-service";

function columnDetails(column: DatasetColumn, dataset: NonNullable<ReturnType<typeof useApp>["currentDataset"]>) {
  const missing = `${formatNumber(column.missingValues)} nilai kosong`;
  const numeric = dataset.profile?.numericColumns.find((item) => item.columnKey === column.key);
  if (numeric) {
    return `${missing} · Min ${formatDatasetValue(numeric.minimum, column)} · Rata-rata ${formatDatasetValue(numeric.average, column)} · Maks ${formatDatasetValue(numeric.maximum, column)}`;
  }
  const categorical = dataset.profile?.categoricalColumns.find((item) => item.columnKey === column.key);
  if (categorical) return `${missing} · ${formatNumber(categorical.distinctValues)} nilai unik`;
  const dateRange = dataset.profile?.dateRanges.find((item) => item.columnKey === column.key);
  if (dateRange) {
    return `${missing} · ${new Date(dateRange.start).toLocaleDateString("id-ID")} – ${new Date(dateRange.end).toLocaleDateString("id-ID")}`;
  }
  return missing;
}

export function PreviewPage() {
  const { currentDataset, notify } = useApp();
  const preview = currentDataset ? getDatasetPreview(currentDataset) : null;
  const rows = preview?.rows ?? [];
  const columns = preview?.columns ?? [];
  const numericCount = columns.filter(isNumericColumn).length;
  const missingValues = currentDataset?.profile?.missingValues ?? 0;
  if (!currentDataset) {
    return <div className="page-content"><PageHeader title="Data Preview" description="Periksa struktur dan isi data sebelum membuat visualisasi." /><Panel className="empty-state"><span><FileSpreadsheet size={24} /></span><h3>Belum ada dataset</h3><p>Unggah file untuk menambahkannya ke workspace.</p><Link className="button button-primary button-small" href="/upload"><ArrowRight size={14} /> Upload Data</Link></Panel></div>;
  }
  return <div className="page-content">
    <PageHeader title="Data Preview" description="Periksa struktur dan isi data sebelum membuat visualisasi." action={<Link className="button button-outline" href="/upload"><ArrowLeft size={15} /> Upload Data Baru</Link>} />
    <Panel className="dataset-summary"><div className="dataset-summary-file"><span className="file-icon large"><FileSpreadsheet size={22} /></span><div><h2>{currentDataset.name}</h2><p>{currentDataset.type}{currentDataset.sheetName && <><span>•</span>Sheet: {currentDataset.sheetName}</>} <span>•</span> Diunggah {currentDataset.uploadedAt}</p></div></div><div className="dataset-summary-status"><StatusBadge>{currentDataset.status}</StatusBadge><small><Clock3 size={13} /> Diperbarui hari ini</small></div></Panel>
    <div className="preview-metrics">{[{ label: "Total Baris", value: formatNumber(rows.length), icon: Rows3 }, { label: "Total Kolom", value: formatNumber(columns.length), icon: Hash }, { label: "Kolom Numerik", value: formatNumber(numericCount), icon: Hash }, { label: "Nilai Kosong", value: formatNumber(missingValues), icon: Type }].map(({ label, value, icon: Icon }) => <Panel key={label} className="preview-metric"><span className="preview-metric-icon"><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong></div></Panel>)}</div>
    <Panel className="columns-panel"><PanelHeading title="Struktur Kolom" subtitle="Tipe data, statistik, dan nilai yang ditemukan dalam dataset" />{columns.length ? <div className="column-list">{columns.map((column) => {
      const sample = rows.length ? getCellValue(rows[0], column) : null;
      return <div className="column-item" key={column.key}><div className="column-name"><span>{isNumericColumn(column) ? <Hash size={14} /> : <Type size={14} />}</span><strong>{column.name}</strong><small>{column.type} · {columnDetails(column, currentDataset)}</small></div><span className="column-sample">{formatDatasetValue(sample, column)}</span></div>;
    })}</div> : <p className="table-empty">Belum ada struktur kolom. Pilih file yang berisi baris header dan data.</p>}</Panel>
    <Panel className="preview-table-panel"><PanelHeading title="Pratinjau Data" subtitle={`Menampilkan ${formatNumber(rows.length)} baris data`} action={<button className="button button-outline button-small" disabled={!rows.length} onClick={() => { downloadCsv(rows, columns, currentDataset.name.replace(/\.[^.]+$/, ".csv")); notify("CSV berhasil diunduh."); }}><Download size={14} /> Download CSV</button>} /><DataTable key={currentDataset.id} rows={rows} columns={columns} pageSize={8} /></Panel>
    <div className="preview-footer"><span><Clock3 size={15} />{rows.length ? `${formatNumber(rows.length)} baris siap divisualisasikan` : currentDataset.type === "Foto Tabel" ? "Foto tabel belum diproses (OCR belum tersedia)" : columns.length ? "Header tersedia, tetapi belum ada baris data" : "Belum ada struktur kolom yang dapat dibaca"}</span><Link className="button button-primary" href="/visualization">Buka Visualisasi <ArrowRight size={16} /></Link></div>
  </div>;
}
