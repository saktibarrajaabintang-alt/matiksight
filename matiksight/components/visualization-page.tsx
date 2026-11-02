"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowLeft, BarChart3, BookmarkPlus, Check, Download, FileDown, FileSpreadsheet,
  LineChart as LineIcon, PieChart as PieIcon, RotateCcw, Save,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { DataTable } from "@/components/data-table";
import { ChartType, chartColors, chartTypes, downloadCsv, formatNumber, formatRupiah, SalesRow, summarizeCategories } from "@/lib/data-utils";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";

type XKey = "tanggal" | "produk" | "kategori";
type YKey = "jumlah" | "harga" | "total";
const xOptions: { label: string; value: XKey }[] = [{ label: "Tanggal", value: "tanggal" }, { label: "Produk", value: "produk" }, { label: "Kategori", value: "kategori" }];
const yOptions: { label: string; value: YKey }[] = [{ label: "Total Penjualan", value: "total" }, { label: "Jumlah Terjual", value: "jumlah" }, { label: "Harga Satuan", value: "harga" }];

function aggregate(rows: SalesRow[], xKey: XKey, yKey: YKey) {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    acc[String(row[xKey])] = (acc[String(row[xKey])] ?? 0) + Number(row[yKey]);
    return acc;
  }, {});
  return Object.entries(grouped).map(([name, value]) => ({ name: xKey === "tanggal" ? new Date(`${name}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : name, value })).slice(0, 14);
}

function ChartView({ type, data, yKey }: { type: ChartType; data: { name: string; value: number }[]; yKey: YKey }) {
  const tooltipFormat = (value: number) => yKey === "total" || yKey === "harga" ? formatRupiah(value) : formatNumber(value);
  const axis = <><CartesianGrid stroke="#eaf0f6" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8290a3", fontSize: 10 }} interval={0} angle={data.length > 8 ? -18 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 50 : 30} /><YAxis axisLine={false} tickLine={false} width={66} tick={{ fill: "#8290a3", fontSize: 10 }} tickFormatter={(value) => yKey === "total" || yKey === "harga" ? `${Math.round(Number(value) / 1000000)} jt` : String(value)} /><Tooltip formatter={(value) => [tooltipFormat(Number(value)), yKey === "total" ? "Penjualan" : "Nilai"]} contentStyle={{ borderRadius: 9, borderColor: "#e5ebf2", fontSize: 12 }} /></>;
  if (type === "Pie" || type === "Donut") return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={type === "Donut" ? "52%" : 0} outerRadius="82%" paddingAngle={2} stroke="#fff" strokeWidth={2}>{data.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => [tooltipFormat(Number(value)), "Nilai"]} contentStyle={{ borderRadius: 9, borderColor: "#e5ebf2" }} /><Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>;
  if (type === "Scatter") return <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>{axis}<Scatter data={data.map((item, index) => ({ x: index + 1, y: item.value, name: item.name }))} fill="#159edb" /></ScatterChart></ResponsiveContainer>;
  if (type === "Bar") return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>{axis}<Bar dataKey="value" fill="#159edb" radius={[4, 4, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer>;
  if (type === "Area") return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><defs><linearGradient id="visualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159edb" stopOpacity={0.25} /><stop offset="100%" stopColor="#159edb" stopOpacity={0.02} /></linearGradient></defs>{axis}<Area type="monotone" dataKey="value" stroke="#159edb" strokeWidth={2.5} fill="url(#visualFill)" /></AreaChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>{axis}<Line type="monotone" dataKey="value" stroke="#159edb" strokeWidth={2.5} dot={{ r: 3, fill: "#159edb", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer>;
}

export function VisualizationPage() {
  const { currentDataset, datasets, setCurrentDatasetId, rows, saveVisualization, notify } = useApp();
  const [chartType, setChartType] = useState<ChartType>("Line");
  const [title, setTitle] = useState("Visualisasi Baru");
  const [xKey, setXKey] = useState<XKey>("tanggal");
  const [yKey, setYKey] = useState<YKey>("total");
  const [period, setPeriod] = useState("30 Hari");
  const chartRef = useRef<HTMLDivElement>(null);
  const filteredRows = useMemo(() => period === "7 Hari" ? rows.slice(-8) : period === "30 Hari" ? rows.slice(-20) : rows, [period, rows]);
  const data = useMemo(() => aggregate(filteredRows, xKey, yKey), [filteredRows, xKey, yKey]);
  const categories = summarizeCategories(rows);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const topCategory = categories.toSorted((a, b) => b.value - a.value)[0];

  if (!currentDataset || rows.length === 0) {
    return <div className="page-content visualization-page">
      <PageHeader title="Visualisasi Data" description="Buat grafik dari data yang tersedia." action={<Link href="/dashboard" className="button button-outline"><ArrowLeft size={15} /> Dashboard</Link>} />
      <Panel className="empty-state"><span><BarChart3 size={24} /></span><h3>{currentDataset ? "Isi file belum tersedia" : "Belum ada dataset"}</h3><p>{currentDataset ? "File ini baru dicatat; pembacaan isi file belum tersedia." : "Tambahkan dataset sebelum membuat visualisasi."}</p><Link className="button button-primary button-small" href="/upload"><FileSpreadsheet size={14} /> Upload Data</Link></Panel>
    </div>;
  }

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
    const html = `<html lang="id"><head><meta charset="utf-8"><title>${title}</title><style>body{font:15px Arial,sans-serif;color:#17243b;padding:40px}h1{color:#101b33}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #dce5f0;padding:9px;text-align:left}th{background:#f3f7fc}</style></head><body><p>MATIKSIGHT · LAPORAN ANALISIS</p><h1>${title}</h1><p>Dataset: ${currentDataset.name} · Tipe grafik: ${chartType}</p><p>Total penjualan: ${formatRupiah(total)}</p><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Kategori</th><th>Jumlah</th><th>Total</th></tr></thead><tbody>${rows.slice(0, 20).map((row) => `<tr><td>${row.tanggal}</td><td>${row.produk}</td><td>${row.kategori}</td><td>${row.jumlah}</td><td>${formatRupiah(row.total)}</td></tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    notify("Laporan siap dicetak atau disimpan sebagai PDF.");
  };
  const handleSave = () => { saveVisualization({ title, datasetName: currentDataset.name, chartType, xKey, yKey }); notify("Visualisasi disimpan ke Laporan."); };
  const reset = () => { setChartType("Line"); setTitle("Visualisasi Baru"); setXKey("tanggal"); setYKey("total"); setPeriod("30 Hari"); notify("Konfigurasi dikembalikan ke awal."); };

  return <div className="page-content visualization-page">
    <PageHeader title="Visualisasi Data" description="Lihat hasil visualisasi dari dataset yang telah Anda olah." action={<Link href="/dashboard" className="button button-outline"><ArrowLeft size={15} /> Dashboard</Link>} />
    <div className="visual-toolbar"><div className="dataset-picker"><FileSpreadsheet size={16} /><select aria-label="Pilih dataset" value={currentDataset.id} onChange={(event) => setCurrentDatasetId(event.target.value)}>{datasets.map((dataset) => <option value={dataset.id} key={dataset.id}>{dataset.name}</option>)}</select></div><div className="visual-actions"><button className="button button-outline button-small" onClick={reset}><RotateCcw size={14} /> Reset</button><button className="button button-outline button-small" onClick={downloadChart}><Download size={14} /> Unduh PNG</button><button className="button button-outline button-small" onClick={() => downloadCsv(rows)}><FileDown size={14} /> Export CSV</button><button className="button button-primary button-small" onClick={handleSave}><Save size={14} /> Simpan</button></div></div>
    <div className="visual-layout">
      <div className="visual-main">
        <Panel className="chart-panel"><PanelHeading title={<input className="chart-title-input" aria-label="Judul visualisasi" value={title} onChange={(event) => setTitle(event.target.value)} />} subtitle={`${currentDataset.name} · ${data.length} kategori data`} action={<SelectField value={period} options={["7 Hari", "30 Hari", "12 Bulan"]} onChange={setPeriod} label="Periode grafik" />} /><div className="chart-type-row">{chartTypes.map((type) => <button key={type} onClick={() => setChartType(type)} className={`chart-type-button${chartType === type ? " active" : ""}`}><span>{type === "Pie" || type === "Donut" ? <PieIcon size={15} /> : type === "Line" || type === "Area" ? <LineIcon size={15} /> : <BarChart3 size={15} />}</span>{type}</button>)}</div><div className={`visual-chart${chartType === "Pie" || chartType === "Donut" ? " pie-visual-chart" : ""}`} ref={chartRef}><ChartView type={chartType} data={data} yKey={yKey} /></div><div className="chart-footnote"><span><i />Data dari {formatNumber(filteredRows.length)} baris</span><button onClick={exportReport}><FileDown size={14} /> Export laporan</button></div></Panel>
        <Panel className="raw-data-panel"><PanelHeading title="Data Mentah" subtitle="Preview data asli dari dataset Anda." action={<button className="text-link" onClick={() => downloadCsv(rows)}>Unduh CSV <Download size={14} /></button>} /><DataTable rows={rows} pageSize={6} compact /></Panel>
      </div>
      <aside className="visual-aside">
        <Panel className="config-panel"><PanelHeading title="Konfigurasi" subtitle="Sesuaikan grafik Anda" /><div className="config-fields"><label>Judul grafik<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Sumbu X<SelectField value={xKey} options={xOptions.map((option) => option.value)} onChange={(value) => setXKey(value as XKey)} label="Kolom sumbu X" /></label><label>Sumbu Y<SelectField value={yKey} options={yOptions.map((option) => option.value)} onChange={(value) => setYKey(value as YKey)} label="Kolom sumbu Y" /></label><div className="config-note"><Check size={14} /> Menampilkan agregasi total berdasarkan {xKey === "tanggal" ? "tanggal" : xKey}.</div></div></Panel>
        <Panel className="insight-panel"><PanelHeading title="Insight" subtitle="Ringkasan dari data saat ini" /><div className="insight-list"><div className="insight-item"><span className="insight-icon green"><Check size={16} /></span><div><strong>{topCategory?.name ?? "Tidak tersedia"} paling dominan</strong><p>Mencakup {topCategory?.percent ?? 0}% dari total kategori.</p></div></div><div className="insight-item"><span className="insight-icon blue"><BarChart3 size={16} /></span><div><strong>{formatRupiah(total)} total</strong><p>Dihitung dari {formatNumber(rows.length)} baris pada dataset aktif.</p></div></div><div className="insight-item"><span className="insight-icon cyan"><BookmarkPlus size={16} /></span><div><strong>{formatNumber(rows.reduce((sum, row) => sum + row.jumlah, 0))} unit</strong><p>Jumlah dari seluruh baris pada dataset aktif.</p></div></div></div></Panel>
        <Panel className="category-panel"><PanelHeading title="Kategori Produk" subtitle="Kontribusi berdasarkan penjualan" />{categories.map((category, index) => <div className="category-progress" key={category.name}><div><span><i style={{ backgroundColor: chartColors[index] }} />{category.name}</span><strong>{category.percent}%</strong></div><div className="progress-track"><i style={{ width: `${category.percent}%`, backgroundColor: chartColors[index] }} /></div></div>)}</Panel>
      </aside>
    </div>
  </div>;
}
