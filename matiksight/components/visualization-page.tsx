"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowLeft, BarChart3, CalendarDays, Check, Download, FileDown, FileSpreadsheet,
  LineChart as LineIcon, Package, PieChart as PieIcon, Save, TrendingUp,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { DataTable } from "@/components/data-table";
import { ChartType, chartColors, chartTypes, downloadCsv, formatNumber, formatRupiah, SalesRow, summarizeCategories } from "@/lib/data-utils";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";

type XKey = "tanggal" | "produk" | "kategori";
type YKey = "jumlah" | "harga" | "total";
const xOptions: { label: string; value: XKey }[] = [{ label: "Tanggal", value: "tanggal" }, { label: "Produk", value: "produk" }, { label: "Kategori", value: "kategori" }];
const yOptions: { label: string; value: YKey }[] = [{ label: "Total Penjualan", value: "total" }, { label: "Jumlah Terjual", value: "jumlah" }, { label: "Harga Satuan", value: "harga" }];
const emptyTrend = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((name) => ({ name, value: 0 }));
const emptyCategories = ["Elektronik", "Fashion", "Olahraga", "Lainnya"].map((name) => ({ name, value: 0, percent: 0 }));

function aggregate(rows: SalesRow[], xKey: XKey, yKey: YKey) {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    acc[String(row[xKey])] = (acc[String(row[xKey])] ?? 0) + Number(row[yKey]);
    return acc;
  }, {});
  return Object.entries(grouped).map(([name, value]) => {
    const date = new Date(`${name}T00:00:00`);
    const label = xKey === "tanggal" && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      : name;
    return { name: label, value };
  }).slice(0, 14);
}

function ChartView({ type, data, yKey }: { type: ChartType; data: { name: string; value: number }[]; yKey: YKey }) {
  const tooltipFormat = (value: number) => yKey === "total" || yKey === "harga" ? formatRupiah(value) : formatNumber(value);
  const noValues = data.every((item) => item.value === 0);
  const axis = <><CartesianGrid stroke="#eaf0f6" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8290a3", fontSize: 10 }} interval={0} angle={data.length > 8 ? -18 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 50 : 30} /><YAxis axisLine={false} tickLine={false} width={66} tick={{ fill: "#8290a3", fontSize: 10 }} domain={[0, (max: number) => Math.max(max, 1)]} ticks={noValues ? [0] : undefined} tickFormatter={(value) => yKey === "total" || yKey === "harga" ? Number(value) === 0 ? "0" : `${Math.round(Number(value) / 1000000)} jt` : String(value)} /><Tooltip formatter={(value) => [tooltipFormat(Number(value)), yKey === "total" ? "Penjualan" : "Nilai"]} contentStyle={{ borderRadius: 9, borderColor: "#e5ebf2", fontSize: 12 }} /></>;
  if (type === "Pie" || type === "Donut") return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={type === "Donut" ? "52%" : 0} outerRadius="82%" paddingAngle={2} stroke="#fff" strokeWidth={2}>{data.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => [tooltipFormat(Number(value)), "Nilai"]} contentStyle={{ borderRadius: 9, borderColor: "#e5ebf2" }} /><Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>;
  if (type === "Scatter") return <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>{axis}<Scatter data={data.map((item, index) => ({ x: index + 1, y: item.value, name: item.name }))} fill="#159edb" /></ScatterChart></ResponsiveContainer>;
  if (type === "Bar") return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>{axis}<Bar dataKey="value" fill="#159edb" radius={[4, 4, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer>;
  if (type === "Area") return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><defs><linearGradient id="visualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159edb" stopOpacity={0.25} /><stop offset="100%" stopColor="#159edb" stopOpacity={0.02} /></linearGradient></defs>{axis}<Area type="monotone" dataKey="value" stroke="#159edb" strokeWidth={2.5} fill="url(#visualFill)" /></AreaChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>{axis}<Line type="monotone" dataKey="value" stroke="#159edb" strokeWidth={2.5} dot={{ r: 3, fill: "#159edb", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function VisualizationPage() {
  const { currentDataset, datasets, setCurrentDatasetId, rows, saveVisualization, notify } = useApp();
  const [chartType, setChartType] = useState<ChartType>("Line");
  const [title, setTitle] = useState("Tren Penjualan");
  const [xKey, setXKey] = useState<XKey>("tanggal");
  const [yKey, setYKey] = useState<YKey>("total");
  const [period, setPeriod] = useState("12 Bulan");
  const chartRef = useRef<HTMLDivElement>(null);
  const filteredRows = useMemo(() => period === "7 Hari" ? rows.slice(-8) : period === "30 Hari" ? rows.slice(-20) : rows, [period, rows]);
  const actualData = useMemo(() => aggregate(filteredRows, xKey, yKey), [filteredRows, xKey, yKey]);
  const data = actualData.length ? actualData : emptyTrend;
  const actualCategories = summarizeCategories(rows);
  const categories = actualCategories.length ? actualCategories : emptyCategories;
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const topCategory = actualCategories.toSorted((a, b) => b.value - a.value)[0];
  const categoryTotal = categories.reduce((sum, category) => sum + category.value, 0);
  const categoryGradient = categoryTotal
    ? `conic-gradient(${categories.map((category, index) => `${chartColors[index % chartColors.length]} ${categories.slice(0, index).reduce((sum, item) => sum + item.value, 0) / categoryTotal * 100}% ${categories.slice(0, index + 1).reduce((sum, item) => sum + item.value, 0) / categoryTotal * 100}%`).join(", ")})`
    : "conic-gradient(#e9f0f8 0% 100%)";

  const downloadChart = () => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) { notify("Grafik belum siap untuk diunduh."); return; }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200; canvas.height = 640;
      const context = canvas.getContext("2d");
      if (!context) { notify("Browser tidak mendukung ekspor grafik."); return; }
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { notify("Grafik gagal diekspor."); return; }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = "matiksight-chart.png"; anchor.click(); URL.revokeObjectURL(url);
        notify("Grafik PNG berhasil diunduh.");
      }, "image/png");
    };
    image.onerror = () => notify("Grafik gagal diekspor sebagai PNG.");
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  };
  const exportReport = () => {
    const reportTitle = escapeHtml(title);
    const datasetName = escapeHtml(currentDataset?.name ?? "Belum ada dataset");
    const body = rows.slice(0, 20).map((row) => `<tr><td>${escapeHtml(row.tanggal)}</td><td>${escapeHtml(row.produk)}</td><td>${escapeHtml(row.kategori)}</td><td>${row.jumlah}</td><td>${formatRupiah(row.total)}</td></tr>`).join("");
    const html = `<html lang="id"><head><meta charset="utf-8"><title>${reportTitle}</title><style>body{font:15px Arial,sans-serif;color:#17243b;padding:40px}h1{color:#101b33}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #dce5f0;padding:9px;text-align:left}th{background:#f3f7fc}</style></head><body><p>MATIKSIGHT · LAPORAN ANALISIS</p><h1>${reportTitle}</h1><p>Dataset: ${datasetName} · Tipe grafik: ${chartType}</p><p>Total penjualan: ${formatRupiah(total)}</p><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Kategori</th><th>Jumlah</th><th>Total</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    notify("Laporan siap dicetak atau disimpan sebagai PDF.");
  };
  const handleSave = () => {
    if (!currentDataset) { notify("Upload dataset sebelum menyimpan visualisasi."); return; }
    saveVisualization({ title, datasetName: currentDataset.name, chartType, xKey, yKey });
    notify("Visualisasi disimpan ke Laporan.");
  };
  const reset = () => { setChartType("Line"); setTitle("Tren Penjualan"); setXKey("tanggal"); setYKey("total"); setPeriod("12 Bulan"); notify("Konfigurasi dikembalikan ke awal."); };

  return <div className="page-content visualization-page">
    <PageHeader title="Visualisasi Data" description="Lihat hasil visualisasi dari dataset yang telah Anda olah." action={<Link href="/dashboard" className="button button-outline"><ArrowLeft size={15} /> Kembali ke Dashboard</Link>} />
    <div className="visual-toolbar"><div className="dataset-picker"><FileSpreadsheet size={16} />{currentDataset ? <select aria-label="Pilih dataset" value={currentDataset.id} onChange={(event) => setCurrentDatasetId(event.target.value)}>{datasets.map((dataset) => <option value={dataset.id} key={dataset.id}>{dataset.name}</option>)}</select> : <Link href="/upload">Upload dataset</Link>}</div><div className="visual-actions"><button className="button button-outline button-small" onClick={reset}>Reset</button><button className="button button-outline button-small" onClick={downloadChart}><Download size={14} /> Unduh PNG</button><button className="button button-outline button-small" disabled={!rows.length} onClick={() => downloadCsv(rows)}><FileDown size={14} /> Export CSV</button><button className="button button-primary button-small" disabled={!currentDataset} onClick={handleSave}><Save size={14} /> Simpan</button></div></div>
    <div className="visual-layout">
      <div className="visual-main">
        <Panel className="chart-panel"><PanelHeading title={<span className="visual-heading"><TrendingUp size={19} />{title}</span>} subtitle={`${currentDataset?.name ?? "Belum ada dataset"} · ${rows.length ? formatNumber(rows.length) + " baris data" : "Menunggu data"}`} action={<SelectField value={period} options={["7 Hari", "30 Hari", "12 Bulan"]} onChange={setPeriod} label="Periode grafik" />} /><div className="chart-type-row">{chartTypes.map((type) => <button key={type} onClick={() => setChartType(type)} className={`chart-type-button${chartType === type ? " active" : ""}`}><span>{type === "Pie" || type === "Donut" ? <PieIcon size={15} /> : type === "Line" || type === "Area" ? <LineIcon size={15} /> : <BarChart3 size={15} />}</span>{type}</button>)}</div><div className={`visual-chart${chartType === "Pie" || chartType === "Donut" ? " pie-visual-chart" : ""}`} ref={chartRef}><ChartView type={chartType} data={data} yKey={yKey} /></div><div className="chart-footnote"><span><i />{rows.length ? `Data dari ${formatNumber(filteredRows.length)} baris` : "Menampilkan nilai awal 0"}</span><button onClick={exportReport}><FileDown size={14} /> Export laporan</button></div></Panel>
        <Panel className="raw-data-panel"><PanelHeading title="Data Mentah" subtitle="Preview data asli dari dataset Anda." action={<button className="text-link" disabled={!rows.length} onClick={() => downloadCsv(rows)}>Unduh CSV <Download size={14} /></button>} /><DataTable rows={rows} pageSize={6} compact /></Panel>
      </div>
      <aside className="visual-aside">
        <Panel className="category-panel"><PanelHeading title="Kategori Produk" subtitle="Distribusi penjualan berdasarkan kategori" /><div className="category-visual"><div className="category-donut" style={{ background: categoryGradient }}><span><strong>{categoryTotal ? "100%" : "0%"}</strong><small>Total</small></span></div><div className="category-legend">{categories.slice(0, 4).map((category, index) => <div key={category.name}><i style={{ background: chartColors[index % chartColors.length] }} /><span>{category.name}</span><strong>{category.percent.toFixed(1)}%</strong></div>)}</div></div></Panel>
        <Panel className="insight-panel"><PanelHeading title="Insight" subtitle="Ringkasan dari data yang Anda miliki" /><div className="insight-list"><div className="insight-item"><span className="insight-icon green"><TrendingUp size={16} /></span><div><strong>{topCategory ? `${topCategory.name} paling dominan` : "Belum ada data penjualan"}</strong><p>{topCategory ? `Kontribusi ${topCategory.percent.toFixed(1)}% dari total.` : "Unggah file CSV atau Excel untuk melihat insight."}</p></div></div><div className="insight-item"><span className="insight-icon blue"><Package size={16} /></span><div><strong>{topCategory ? `${topCategory.percent.toFixed(1)}% kontribusi kategori teratas` : "Kategori teratas —"}</strong><p>{topCategory ? `Kategori ${topCategory.name}.` : "Nilai akan dihitung dari data file."}</p></div></div><div className="insight-item"><span className="insight-icon cyan"><CalendarDays size={16} /></span><div><strong>Total Penjualan</strong><p className="insight-total">{formatRupiah(total)}</p></div></div></div></Panel>
        <Panel className="config-panel"><PanelHeading title="Konfigurasi" subtitle="Pilih kolom untuk grafik" /><div className="config-fields"><label>Sumbu X<SelectField value={xKey} options={xOptions.map((option) => option.value)} onChange={(value) => setXKey(value as XKey)} label="Kolom sumbu X" /></label><label>Sumbu Y<SelectField value={yKey} options={yOptions.map((option) => option.value)} onChange={(value) => setYKey(value as YKey)} label="Kolom sumbu Y" /></label><div className="config-note"><Check size={14} />Nilai mengikuti isi spreadsheet yang diunggah.</div></div></Panel>
      </aside>
    </div>
  </div>;
}
