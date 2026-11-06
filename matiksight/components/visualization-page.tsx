"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { ChartType, chartColors, chartTypes, DataRow, downloadCsv, formatNumber } from "@/lib/data-utils";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";
import { apiRequest } from "@/lib/api";

type ChartPoint = { name: string; value: number };
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function ChartView({ type, data }: { type: ChartType; data: ChartPoint[] }) {
  const tooltipFormat = (value: number) => formatNumber(value);
  const axis = <><CartesianGrid stroke="#eaf0f6" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8290a3", fontSize: 10 }} interval={0} angle={data.length > 8 ? -18 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 50 : 30} /><YAxis axisLine={false} tickLine={false} width={66} tick={{ fill: "#8290a3", fontSize: 10 }} tickFormatter={(value) => formatNumber(Number(value))} /><Tooltip formatter={(value) => [tooltipFormat(Number(value)), "Nilai"]} contentStyle={{ borderRadius: 9, borderColor: "#e5ebf2", fontSize: 12 }} /></>;
  if (type === "Pie" || type === "Donut") return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={type === "Donut" ? "52%" : 0} outerRadius="82%" paddingAngle={2} stroke="#fff" strokeWidth={2}>{data.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => [tooltipFormat(Number(value)), "Nilai"]} contentStyle={{ borderRadius: 9, borderColor: "#e5ebf2" }} /><Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>;
  if (type === "Scatter") return <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>{axis}<Scatter data={data.map((item, index) => ({ x: index + 1, y: item.value, name: item.name }))} fill="#159edb" /></ScatterChart></ResponsiveContainer>;
  if (type === "Bar") return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>{axis}<Bar dataKey="value" fill="#159edb" radius={[4, 4, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer>;
  if (type === "Area") return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><defs><linearGradient id="visualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159edb" stopOpacity={0.25} /><stop offset="100%" stopColor="#159edb" stopOpacity={0.02} /></linearGradient></defs>{axis}<Area type="monotone" dataKey="value" stroke="#159edb" strokeWidth={2.5} fill="url(#visualFill)" /></AreaChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>{axis}<Line type="monotone" dataKey="value" stroke="#159edb" strokeWidth={2.5} dot={{ r: 3, fill: "#159edb", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer>;
}

export function VisualizationPage() {
  const { currentDataset, datasets, setCurrentDatasetId, rows, columnMetadata, saveVisualization, saveReport, notify, token } = useApp();
  const [chartType, setChartType] = useState<ChartType>("Line");
  const [title, setTitle] = useState("Visualisasi Baru");
  const [xKey, setXKey] = useState("");
  const [yKey, setYKey] = useState("");
  const [aggregation, setAggregation] = useState("sum");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartError, setChartError] = useState("");
  const [chartLoading, setChartLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => currentDataset?.columns ?? Object.keys(rows[0] ?? {}), [currentDataset, rows]);
  const numericColumns = useMemo(() => columnMetadata.filter((column) => column.type === "number").map((column) => column.name), [columnMetadata]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!currentDataset) { setXKey(""); setYKey(""); return; }
      setXKey((current) => columns.includes(current) ? current : columns[0] ?? "");
      setYKey((current) => numericColumns.includes(current) ? current : numericColumns[0] ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentDataset, columns, numericColumns]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!token || !currentDataset || !xKey || !yKey) {
        setChartData([]);
        setChartLoading(false);
        return;
      }
      setChartLoading(true);
      setChartError("");
      void apiRequest<{ data: DataRow[] }>(`/datasets/${encodeURIComponent(currentDataset.id)}/visualizations/data`, {
        token,
        body: { chartType: chartType.toLowerCase(), xAxis: xKey, yAxis: yKey, aggregation, limit: 100 },
      }).then((result) => {
        if (active) setChartData(result.data.map((point) => ({
          name: String(point[xKey] ?? "(kosong)"),
          value: Number(point[chartType === "Scatter" ? yKey : "value"] ?? 0),
        })));
      }).catch((reason: unknown) => {
        if (active) {
          setChartData([]);
          setChartError(reason instanceof Error ? reason.message : "Data visualisasi gagal dimuat.");
        }
      }).finally(() => { if (active) setChartLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [token, currentDataset, xKey, yKey, chartType, aggregation]);

  const data = chartData;
  const topCategory = data.toSorted((a, b) => b.value - a.value)[0];
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const categories = data.map((point) => ({ name: point.name, percent: total > 0 ? Math.round(point.value / total * 1000) / 10 : 0 }));

  if (!currentDataset || !rows.length) {
    return <div className="page-content visualization-page">
      <PageHeader title="Visualisasi Data" description="Buat grafik dari data yang tersedia." action={<Link href="/dashboard" className="button button-outline"><ArrowLeft size={15} /> Dashboard</Link>} />
      <Panel className="empty-state"><span><BarChart3 size={24} /></span><h3>{currentDataset ? "Data sedang dimuat" : "Belum ada dataset"}</h3><p>{currentDataset ? "Pratinjau dataset belum tersedia. Muat ulang atau pilih dataset lain." : "Tambahkan dataset sebelum membuat visualisasi."}</p><Link className="button button-primary button-small" href="/upload"><FileSpreadsheet size={14} /> Upload Data</Link></Panel>
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
  const exportReport = async () => {
    try {
      await saveReport(currentDataset.id, title, {
        chartType: chartType.toLowerCase(), xAxis: xKey, yAxis: yKey, aggregation,
      }, { total, categories: data, previewRows: rows.slice(0, 20) });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Laporan gagal disimpan.");
      return;
    }
    const html = `<html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:15px Arial,sans-serif;color:#17243b;padding:40px}h1{color:#101b33}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #dce5f0;padding:9px;text-align:left}th{background:#f3f7fc}</style></head><body><p>MATIKSIGHT · LAPORAN ANALISIS</p><h1>${escapeHtml(title)}</h1><p>Dataset: ${escapeHtml(currentDataset.name)} · Tipe grafik: ${escapeHtml(chartType)}</p><p>Total: ${formatNumber(total)}</p><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.slice(0, 20).map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    notify("Laporan disimpan dan siap dicetak atau disimpan sebagai PDF.");
  };
  const handleSave = async () => {
    if (!xKey || !yKey) { notify("Pilih kolom sumbu X dan Y terlebih dahulu."); return; }
    try { await saveVisualization({ title, datasetId: currentDataset.id, chartType, xKey, yKey, aggregation }); notify("Visualisasi disimpan ke database."); }
    catch (reason) { notify(reason instanceof Error ? reason.message : "Visualisasi gagal disimpan."); }
  };
  const reset = () => { setChartType("Line"); setTitle("Visualisasi Baru"); setXKey(columns[0] ?? ""); setYKey(numericColumns[0] ?? ""); setAggregation("sum"); notify("Konfigurasi dikembalikan ke awal."); };

  return <div className="page-content visualization-page">
    <PageHeader title="Visualisasi Data" description="Lihat hasil visualisasi dari dataset yang telah Anda olah." action={<Link href="/dashboard" className="button button-outline"><ArrowLeft size={15} /> Dashboard</Link>} />
    <div className="visual-toolbar"><div className="dataset-picker"><FileSpreadsheet size={16} /><select aria-label="Pilih dataset" value={currentDataset.id} onChange={(event) => setCurrentDatasetId(event.target.value)}>{datasets.map((dataset) => <option value={dataset.id} key={dataset.id}>{dataset.name}</option>)}</select></div><div className="visual-actions"><button className="button button-outline button-small" onClick={reset}><RotateCcw size={14} /> Reset</button><button className="button button-outline button-small" onClick={downloadChart}><Download size={14} /> Unduh PNG</button><button className="button button-outline button-small" onClick={() => downloadCsv(rows)}><FileDown size={14} /> Export CSV</button><button className="button button-primary button-small" onClick={() => void handleSave()}><Save size={14} /> Simpan</button></div></div>
    <div className="visual-layout">
      <div className="visual-main">
        <Panel className="chart-panel"><PanelHeading title={<input className="chart-title-input" aria-label="Judul visualisasi" value={title} onChange={(event) => setTitle(event.target.value)} />} subtitle={`${currentDataset.name} · ${data.length} kategori data`} action={<SelectField value={aggregation} options={["sum", "average", "count"]} onChange={setAggregation} label="Agregasi grafik" />} /><div className="chart-type-row">{chartTypes.map((type) => <button key={type} onClick={() => setChartType(type)} className={`chart-type-button${chartType === type ? " active" : ""}`}><span>{type === "Pie" || type === "Donut" ? <PieIcon size={15} /> : type === "Line" || type === "Area" ? <LineIcon size={15} /> : <BarChart3 size={15} />}</span>{type}</button>)}</div>{chartError && <p className="form-error" role="alert">{chartError}</p>}<div className={`visual-chart${chartType === "Pie" || chartType === "Donut" ? " pie-visual-chart" : ""}`} ref={chartRef}>{chartLoading ? <p className="table-empty">Memuat visualisasi...</p> : data.length ? <ChartView type={chartType} data={data} /> : <p className="table-empty">Tidak ada hasil visualisasi untuk konfigurasi ini.</p>}</div><div className="chart-footnote"><span><i />Hasil agregasi dari API backend · {formatNumber(data.length)} kategori</span><button onClick={() => void exportReport()}><FileDown size={14} /> Export laporan</button></div></Panel>
        <Panel className="raw-data-panel"><PanelHeading title="Data Mentah" subtitle="Preview data asli dari dataset Anda." action={<button className="text-link" onClick={() => downloadCsv(rows)}>Unduh CSV <Download size={14} /></button>} /><DataTable rows={rows} pageSize={6} compact /></Panel>
      </div>
      <aside className="visual-aside">
        <Panel className="config-panel"><PanelHeading title="Konfigurasi" subtitle="Sesuaikan grafik Anda" /><div className="config-fields"><label>Judul grafik<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Sumbu X<SelectField value={xKey} options={columns} onChange={setXKey} label="Kolom sumbu X" /></label><label>Sumbu Y<SelectField value={yKey} options={numericColumns} onChange={setYKey} label="Kolom sumbu Y" /></label><div className="config-note"><Check size={14} /> Menggunakan kolom {xKey || "X"} dan {yKey || "Y"}.</div></div></Panel>
        <Panel className="insight-panel"><PanelHeading title="Insight" subtitle="Ringkasan agregasi dari API" /><div className="insight-list"><div className="insight-item"><span className="insight-icon green"><Check size={16} /></span><div><strong>{topCategory?.name ?? "Tidak tersedia"} paling dominan</strong><p>Nilai agregasi tertinggi pada grafik.</p></div></div><div className="insight-item"><span className="insight-icon blue"><BarChart3 size={16} /></span><div><strong>{formatNumber(total)} total agregasi</strong><p>Dihitung oleh backend untuk {formatNumber(data.length)} kategori.</p></div></div><div className="insight-item"><span className="insight-icon cyan"><BookmarkPlus size={16} /></span><div><strong>{formatNumber(rows.length)} baris pratinjau</strong><p>Baris mentah dimuat dari endpoint dataset preview.</p></div></div></div></Panel>
        <Panel className="category-panel"><PanelHeading title="Kategori Produk" subtitle="Kontribusi berdasarkan penjualan" />{categories.map((category, index) => <div className="category-progress" key={category.name}><div><span><i style={{ backgroundColor: chartColors[index] }} />{category.name}</span><strong>{category.percent}%</strong></div><div className="progress-track"><i style={{ width: `${category.percent}%`, backgroundColor: chartColors[index] }} /></div></div>)}</Panel>
      </aside>
    </div>
  </div>;
}
