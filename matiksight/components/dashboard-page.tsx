"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowRight, BarChart3, Clock3, Database, FileSpreadsheet, Layers3 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Panel, PanelHeading, SelectField } from "@/components/ui";
import { chartColors, DateRange, dateRanges, formatNumber } from "@/lib/data-utils";

const rangeDays: Record<DateRange, number> = {
  "7 Hari Terakhir": 7,
  "30 Hari Terakhir": 30,
  "90 Hari Terakhir": 90,
  "12 Bulan Terakhir": 365,
};

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function DashboardPage() {
  const { datasets, visualizations, settings } = useApp();
  const [range, setRange] = useState<DateRange>("7 Hari Terakhir");
  const [chartMetric, setChartMetric] = useState<"Jumlah Dataset" | "Ukuran File">("Jumlah Dataset");
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setToday(new Date()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const totalKilobytes = datasets.reduce((total, dataset) => total + dataset.size, 0);
  const distribution = [
    { name: "Bar Chart", value: visualizations.filter((item) => item.chartType === "Bar").length },
    { name: "Line Chart", value: visualizations.filter((item) => item.chartType === "Line").length },
    { name: "Pie Chart", value: visualizations.filter((item) => item.chartType === "Pie" || item.chartType === "Donut").length },
    { name: "Lainnya", value: visualizations.filter((item) => item.chartType === "Area" || item.chartType === "Scatter").length },
  ].filter((item) => item.value > 0);
  const trendData = useMemo(() => {
    const days = rangeDays[range];
    if (!today) return [];
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (days - index - 1));
      const key = getDayKey(date);
      const matched = datasets.filter((dataset) => {
        if (!dataset.createdAt) return false;
        const uploaded = new Date(dataset.createdAt);
        return !Number.isNaN(uploaded.getTime()) && getDayKey(uploaded) === key;
      });
      return {
        day: days === 7
          ? date.toLocaleDateString("id-ID", { weekday: "short" })
          : date.toLocaleDateString("id-ID", days > 90 ? { month: "short" } : { day: "numeric", month: "short" }),
        value: chartMetric === "Jumlah Dataset"
          ? matched.length
          : matched.reduce((sum, dataset) => sum + dataset.size, 0),
      };
    });
  }, [datasets, range, chartMetric, today]);
  const stats = [
    { label: "Total Dataset", value: formatNumber(datasets.length), icon: Database, color: "blue", hint: "file di workspace" },
    { label: "Visualisasi", value: formatNumber(visualizations.length), icon: BarChart3, color: "violet", hint: "tersimpan" },
    { label: "Belum diproses", value: formatNumber(datasets.filter((dataset) => dataset.status === "Belum diproses").length), icon: Clock3, color: "green", hint: "file menunggu proses" },
    { label: "Total Data", value: totalKilobytes >= 1024 ? `${(totalKilobytes / 1024).toFixed(1)} MB` : `${totalKilobytes} KB`, icon: Layers3, color: "cyan", hint: "ukuran file tersimpan" },
  ];

  return <div className="page-content dashboard-page">
    <div className="welcome-row">
      <div><p className="eyebrow">OVERVIEW</p><h1>{settings.name ? `Selamat datang, ${settings.name}` : "Selamat datang"} <span className="wave">👋</span></h1><p className="welcome-subtitle">Visualisasikan data Excel Anda dengan mudah dan profesional.</p></div>
      <SelectField value={range} options={dateRanges} onChange={(value) => setRange(value as DateRange)} label="Rentang waktu" />
    </div>
    <div className="metrics-grid">{stats.map(({ label, value, icon: Icon, color, hint }) => <Panel key={label} className="metric-card"><div className={`metric-icon ${color}`}><Icon size={20} strokeWidth={1.9} /></div><div className="metric-content"><span>{label}</span><strong>{value}</strong><div><small>{hint}</small></div></div></Panel>)}</div>
    <div className="dashboard-charts">
      <Panel className="activity-panel">
        <PanelHeading title="Tren Data" subtitle={`Perkembangan data dalam ${range.toLowerCase()}`} action={<SelectField value={chartMetric} options={["Jumlah Dataset", "Ukuran File"]} onChange={(value) => setChartMetric(value as typeof chartMetric)} label="Metrik grafik" />} />
        <div className="chart-area activity-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2787df" stopOpacity={0.2} /><stop offset="95%" stopColor="#2787df" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#eaf0f6" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#8290a3", fontSize: 11 }} dy={8} interval={daysInterval(range)} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8290a3", fontSize: 10 }} allowDecimals={false} domain={[0, (max: number) => Math.max(max, 1)]} /><Tooltip formatter={(value) => [chartMetric === "Jumlah Dataset" ? formatNumber(Number(value)) : `${formatNumber(Number(value))} KB`, chartMetric]} contentStyle={{ border: "1px solid #e4eaf1", borderRadius: 10, boxShadow: "0 8px 24px #17243b14", fontSize: 12 }} /><Area type="monotone" dataKey="value" stroke="#2787df" strokeWidth={2.5} fill="url(#activityFill)" activeDot={{ r: 5, fill: "#2787df", stroke: "white", strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div>
      </Panel>
      <Panel className="distribution-panel"><PanelHeading title="Jenis Visualisasi" subtitle="Komposisi visualisasi Anda" />
        {distribution.length ? <div className="distribution-content"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius="59%" outerRadius="84%" paddingAngle={2} stroke="none">{distribution.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e4eaf1" }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{formatNumber(visualizations.length)}</strong><span>grafik</span></div></div><div className="legend-list">{distribution.map((item, index) => <div key={item.name}><i style={{ backgroundColor: chartColors[index % chartColors.length] }} /><span>{item.name}</span><strong>{Math.round(item.value / visualizations.length * 100)}%</strong></div>)}</div></div> : <div className="empty-state"><span><BarChart3 size={23} /></span><h3>Belum ada visualisasi</h3><p>Komposisi akan muncul setelah visualisasi disimpan.</p></div>}
      </Panel>
    </div>
    <div className="dashboard-bottom">
      <Panel className="recent-panel"><PanelHeading title="Dataset Terbaru" subtitle="File yang baru saja diunggah" action={<Link className="text-link" href="/history">Lihat Semua <ArrowRight size={14} /></Link>} />
        {datasets.length ? <div className="recent-list">{datasets.slice(0, 3).map((dataset) => <div className="recent-row" key={dataset.id}><span className="file-icon"><FileSpreadsheet size={16} /></span><div className="recent-name"><strong>{dataset.name}</strong><small>{dataset.type} · {dataset.uploadedAt}</small></div><span className="recent-size">{dataset.size} KB</span></div>)}</div> : <div className="dashboard-empty-recent"><FileSpreadsheet size={16} /><span>Belum ada dataset</span></div>}
      </Panel>
      <section className="upload-promo"><div className="promo-shapes" /><div className="promo-top"><span><BarChart3 size={19} /></span><span className="promo-label">MATIKSIGHT WORKSPACE</span></div><h2>Mulai Visualisasi<br />Sekarang!</h2><p>Upload file Excel Anda dan ubah data menjadi insight yang berarti.</p><Link className="button button-primary promo-button" href="/upload">Upload Sekarang <ArrowRight size={16} /></Link><div className="promo-file"><FileSpreadsheet size={37} /></div></section>
    </div>
  </div>;
}

function daysInterval(range: DateRange) {
  return range === "7 Hari Terakhir" ? 0 : range === "30 Hari Terakhir" ? 4 : range === "90 Hari Terakhir" ? 14 : 29;
}
