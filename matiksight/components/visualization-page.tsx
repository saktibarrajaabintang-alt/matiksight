"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowLeft, BarChart3, CalendarDays, Check, Database, Download, FileDown, FileSpreadsheet,
  Layers3, LineChart as LineIcon, Package, PieChart as PieIcon, Save, TrendingUp,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { DataTable } from "@/components/data-table";
import {
  AggregationResponse,
  AggregationOperation,
  aggregationOptions,
  ChartPeriod,
  ChartType,
  chartColors,
  chartTypes,
  DatasetColumn,
  downloadCsv,
  formatDatasetValue,
  formatNumber,
  getCellValue,
} from "@/lib/data-utils";
import { isDimension, isNumericColumn, recommendCharts } from "@/lib/dataset-service";
import { apiRequest } from "@/lib/api-client";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function ChartView({
  type,
  data,
  yColumn,
}: {
  type: ChartType;
  data: { name: string; value: number; x: number }[];
  yColumn?: DatasetColumn;
}) {
  const formatValue = (value: number) => formatDatasetValue(value, yColumn);
  const tickFormatter = (value: number) => yColumn?.type === "currency"
    ? formatDatasetValue(value, yColumn)
    : formatNumber(value);
  const axis = <><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} interval={0} angle={data.length > 8 ? -18 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 50 : 30} /><YAxis axisLine={false} tickLine={false} width={66} tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={tickFormatter} /><Tooltip formatter={(value) => [formatValue(Number(value)), yColumn?.name ?? "Count"]} contentStyle={{ color: "var(--ink)", backgroundColor: "var(--surface-elevated)", borderRadius: 9, borderColor: "var(--border)", fontSize: 12 }} /></>;
  if (type === "Pie" || type === "Donut") return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={type === "Donut" ? "52%" : 0} outerRadius="82%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>{data.map((item, index) => <Cell key={`${item.name}-${index}`} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => [formatValue(Number(value)), yColumn?.name ?? "Count"]} contentStyle={{ color: "var(--ink)", backgroundColor: "var(--surface-elevated)", borderRadius: 9, borderColor: "var(--border)" }} /><Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ color: "var(--text-secondary)", fontSize: 11 }} /></PieChart></ResponsiveContainer>;
  if (type === "Scatter") return <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}><CartesianGrid stroke="var(--chart-grid)" /><XAxis type="number" dataKey="x" name="X" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} /><YAxis type="number" dataKey="value" name={yColumn?.name ?? "Count"} axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={tickFormatter} /><Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value) => [formatValue(Number(value)), yColumn?.name ?? "Count"]} labelFormatter={(label) => String(label)} contentStyle={{ color: "var(--ink)", backgroundColor: "var(--surface-elevated)", borderRadius: 9, borderColor: "var(--border)", fontSize: 12 }} /><Scatter data={data} fill="#159edb" /></ScatterChart></ResponsiveContainer>;
  if (type === "Bar") return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>{axis}<Bar dataKey="value" fill="#159edb" radius={[4, 4, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer>;
  if (type === "Area") return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><defs><linearGradient id="visualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159edb" stopOpacity={0.25} /><stop offset="100%" stopColor="#159edb" stopOpacity={0.02} /></linearGradient></defs>{axis}<Area type="monotone" dataKey="value" stroke="#159edb" strokeWidth={2.5} fill="url(#visualFill)" /></AreaChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>{axis}<Line type="monotone" dataKey="value" stroke="#159edb" strokeWidth={2.5} dot={{ r: 3, fill: "#159edb", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer>;
}

function fieldOptions(columns: DatasetColumn[]) {
  return columns.map((column) => ({ value: column.key, label: column.name }));
}

type VisualizationDataResponse = { success: true; data: Record<string, unknown>[] };
type AggregateDataResponse = { success: true; data: { results: Record<string, unknown>[] } };
const emptyResult: AggregationResponse = { data: [], groupCount: 0, skippedRows: 0, skippedValues: 0 };

export function VisualizationPage({ datasetId }: { datasetId?: string } = {}) {
  const { currentDataset: activeDataset, datasets, setCurrentDatasetId, saveVisualization, notify } = useApp();
  const currentDataset = datasetId === undefined
    ? activeDataset
    : datasets.find((dataset) => dataset.id === datasetId) ?? null;
  const rows = currentDataset?.data ?? [];
  const columns = currentDataset?.columns ?? [];
  const numericColumns = columns.filter(isNumericColumn);
  const dimensionColumns = columns.filter(isDimension);
  const recommendations = currentDataset ? recommendCharts(currentDataset) : [];
  const [selectedChartType, setSelectedChartType] = useState<ChartType | null>(null);
  const [title, setTitle] = useState("");
  const [xKey, setXKey] = useState("");
  const [yKey, setYKey] = useState("");
  const [selectedAggregation, setSelectedAggregation] = useState<AggregationOperation | null>(null);
  const [period, setPeriod] = useState<ChartPeriod>("Semua Data");
  const [result, setResult] = useState<AggregationResponse>(emptyResult);
  const [categoriesResult, setCategoriesResult] = useState<{ name: string; value: number; x: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chartError, setChartError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);

  const chartType = selectedChartType ?? (datasetId ? recommendations[0]?.chartType ?? "Line" : "Line");
  const aggregation = selectedAggregation ?? (datasetId
    ? recommendations[0]?.aggregation ?? (numericColumns.length ? "sum" : "count")
    : "sum");
  const setChartType = setSelectedChartType;
  const setAggregation = setSelectedAggregation;
  const xColumns = chartType === "Scatter"
    ? numericColumns
    : chartType === "Pie" || chartType === "Donut"
      ? columns.filter((column) => column.type === "string" || column.type === "boolean")
      : dimensionColumns;
  const chartRecommendation = recommendations.find((recommendation) =>
    chartType === "Scatter" ? recommendation.chartType === chartType : recommendation.chartType !== "Scatter",
  );
  const effectiveXKey = xColumns.some((column) => column.key === xKey)
    ? xKey
    : chartRecommendation && xColumns.some((column) => column.key === chartRecommendation.xKey)
      ? chartRecommendation.xKey
      : xColumns[0]?.key ?? "";
  const effectiveYKey = numericColumns.some((column) => column.key === yKey)
    ? yKey
    : chartRecommendation?.yKey && numericColumns.some((column) => column.key === chartRecommendation.yKey)
      ? chartRecommendation.yKey
      : numericColumns[0]?.key ?? "";
  const activeAggregation = numericColumns.length || aggregation === "count" ? aggregation : "count";
  const xColumn = columns.find((column) => column.key === effectiveXKey);
  const yColumn = columns.find((column) => column.key === effectiveYKey);
  const recommendedTitle = xColumn
    ? activeAggregation === "count" || !yColumn ? `Count by ${xColumn.name}` : `${yColumn.name} by ${xColumn.name}`
    : "Visualisasi Data";
  const displayTitle = title.trim() || recommendedTitle;
  const dateColumn = columns.find((column) => column.type === "date" || column.type === "datetime");
  const periodOptions: ChartPeriod[] = dateColumn
    ? ["Semua Data", "7 Hari", "30 Hari", "12 Bulan"]
    : ["Semua Data"];
  const chartFilters = useMemo(() => {
    if (!currentDataset || !dateColumn || period === "Semua Data") return [];
    const days = period === "7 Hari" ? 7 : period === "30 Hari" ? 30 : 365;
    const dateRange = currentDataset.profile?.dateRanges.find((range) => range.columnKey === dateColumn.key);
    const latest = dateRange ? new Date(dateRange.end) : new Date();
    if (Number.isNaN(latest.getTime())) return [];
    latest.setDate(latest.getDate() - days);
    return [{ column: dateColumn.name, operator: "gte", value: latest.toISOString() }];
  }, [currentDataset, dateColumn, period]);
  const hasValidChart = !!currentDataset && !!xColumn && (activeAggregation === "count" && chartType !== "Scatter" || !!yColumn) && result.data.length > 0 && !chartLoading;
  const categoryColumn = columns.find((column) => column.key === recommendations[0]?.xKey) ?? dimensionColumns[0];
  const sortedCategories = categoriesResult.toSorted((left, right) => right.value - left.value);
  const categoryTotal = sortedCategories.reduce((sum, item) => sum + item.value, 0);
  const categories = sortedCategories.length > 4
    ? [...sortedCategories.slice(0, 3), {
      name: "Lainnya",
      value: sortedCategories.slice(3).reduce((sum, item) => sum + item.value, 0),
      x: 0,
    }]
    : sortedCategories;
  const categoryGradient = categoryTotal
    ? `conic-gradient(${categories.map((category, index) => `${chartColors[index % chartColors.length]} ${categories.slice(0, index).reduce((sum, item) => sum + item.value, 0) / categoryTotal * 100}% ${categories.slice(0, index + 1).reduce((sum, item) => sum + item.value, 0) / categoryTotal * 100}%`).join(", ")})`
    : "conic-gradient(var(--chart-grid) 0% 100%)";
  const topCategory = categories[0];
  const numericStats = currentDataset?.profile?.numericColumns.find((item) => item.columnKey === effectiveYKey);
  const dateRange = currentDataset?.profile?.dateRanges[0];
  const datasetKpis = currentDataset ? [
    { label: "Total baris", value: formatNumber(currentDataset.rows), hint: "baris data", icon: Database, color: "blue" },
    { label: "Total kolom", value: formatNumber(columns.length), hint: "field tersedia", icon: Layers3, color: "violet" },
    ...(currentDataset.profile?.numericColumns.slice(0, 2).map((stat, index) => {
      const column = columns.find((item) => item.key === stat.columnKey);
      return {
        label: `Total ${column?.name ?? `metrik ${index + 1}`}`,
        value: formatDatasetValue(stat.sum, column),
        hint: `rata-rata ${formatDatasetValue(stat.average, column)}`,
        icon: index === 0 ? TrendingUp : BarChart3,
        color: index === 0 ? "green" : "cyan",
      };
    }) ?? []),
  ] : [];

  useEffect(() => {
    let active = true;
    if (!currentDataset || !xColumn || (activeAggregation !== "count" && !yColumn) || (chartType === "Scatter" && !yColumn)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Discard the previous request's chart when this selection has no valid request.
      setResult(emptyResult);
      setChartLoading(false);
      setChartError("");
      return () => { active = false; };
    }
    setChartLoading(true);
    setChartError("");
    const countByCategory = activeAggregation === "count" && chartType !== "Scatter";
    const yAxis = yColumn?.name ?? "";
    const dataRequest: Promise<Record<string, unknown>[]> = countByCategory
      ? apiRequest<AggregateDataResponse>(`/datasets/${encodeURIComponent(currentDataset.id)}/aggregate`, {
        method: "POST",
        body: {
          groupBy: [xColumn.name],
          metrics: [{ operation: "count" }],
          filters: chartFilters,
          sort: { column: "metric_1", direction: "desc" },
          limit: 100,
        },
      }).then((response) => response.data.results.map((row) => ({ ...row, value: row.metric_1 })))
      : apiRequest<VisualizationDataResponse>(`/datasets/${encodeURIComponent(currentDataset.id)}/visualizations/data`, {
        method: "POST",
        body: {
          chartType: chartType.toLowerCase(),
          xAxis: xColumn.name,
          yAxis,
          aggregation: activeAggregation,
          filters: chartFilters,
          sort: chartType === "Scatter" ? undefined : { column: "value", direction: "desc" },
          limit: chartType === "Scatter" ? 1000 : 100,
        },
      }).then((response) => response.data);
    void dataRequest.then((responseData) => {
      if (!active) return;
      const data = responseData.flatMap((row, index) => {
        const value = Number(chartType === "Scatter" ? row[yAxis] : row.value);
        const x = chartType === "Scatter" ? Number(row[xColumn.name]) : index;
        if (!Number.isFinite(value) || !Number.isFinite(x)) return [];
        return [{ name: String(row[xColumn.name] ?? index + 1), value, x }];
      });
      setResult({ data, groupCount: data.length, skippedRows: 0, skippedValues: 0 });
    }).catch((error: unknown) => {
      if (!active) return;
      setResult(emptyResult);
      setChartError(error instanceof Error ? error.message : "Agregasi dataset gagal.");
    }).finally(() => {
      if (active) setChartLoading(false);
    });
    return () => { active = false; };
  }, [currentDataset, xColumn, yColumn, activeAggregation, chartType, chartFilters]);

  useEffect(() => {
    let active = true;
    if (!currentDataset || !categoryColumn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the prior dataset's distribution when there is no category to aggregate.
      setCategoriesResult([]);
      setCategoryError("");
      return () => { active = false; };
    }
    const metric = yColumn
      ? { column: yColumn.name, operation: "sum" }
      : { operation: "count" };
    void apiRequest<AggregateDataResponse>(`/datasets/${encodeURIComponent(currentDataset.id)}/aggregate`, {
      method: "POST",
      body: {
        groupBy: [categoryColumn.name],
        metrics: [metric],
        sort: { column: "metric_1", direction: "desc" },
        limit: 100,
      },
    }).then((response) => {
      if (!active) return;
      setCategoriesResult(response.data.results.flatMap((row, index) => {
        const value = Number(row.metric_1);
        if (!Number.isFinite(value)) return [];
        return [{ name: String(row[categoryColumn.name] ?? index + 1), value, x: index }];
      }));
      setCategoryError("");
    }).catch((error: unknown) => {
      if (!active) return;
      setCategoriesResult([]);
      setCategoryError(error instanceof Error ? error.message : "Distribusi dataset gagal dimuat.");
    });
    return () => { active = false; };
  }, [currentDataset, categoryColumn, yColumn]);

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
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { notify("Grafik gagal diekspor."); return; }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "matiksight-chart.png";
        anchor.click();
        URL.revokeObjectURL(url);
        notify("Grafik PNG berhasil diunduh.");
      }, "image/png");
    };
    image.onerror = () => notify("Grafik gagal diekspor sebagai PNG.");
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  };

  const exportReport = () => {
    if (!currentDataset || !hasValidChart || !xColumn) {
      notify("Pilih dataset dan kolom yang valid sebelum mengekspor laporan.");
      return;
    }
    const reportTitle = escapeHtml(displayTitle);
    const datasetName = escapeHtml(currentDataset.name);
    const headers = columns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join("");
    const body = rows.slice(0, 100).map((row) =>
      `<tr>${columns.map((column) => `<td>${escapeHtml(formatDatasetValue(getCellValue(row, column), column))}</td>`).join("")}</tr>`,
    ).join("");
    const aggregateRows = result.data.map((item) =>
      `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(formatDatasetValue(item.value, activeAggregation === "count" ? undefined : yColumn))}</td></tr>`,
    ).join("");
    const aggregateLabel = activeAggregation === "count" ? "Jumlah baris" : yColumn?.name ?? "Jumlah baris";
    const html = `<html lang="id"><head><meta charset="utf-8"><title>${reportTitle}</title><style>body{font:15px Arial,sans-serif;color:#17243b;padding:40px}h1{color:#101b33}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #dce5f0;padding:9px;text-align:left}th{background:#f3f7fc}</style></head><body><p>MATIKSIGHT · LAPORAN ANALISIS</p><h1>${reportTitle}</h1><p>Dataset: ${datasetName} · Tipe grafik: ${chartType} · Agregasi: ${activeAggregation} · Periode: ${period}</p><p>Sumbu X: ${escapeHtml(xColumn.name)} · Sumbu Y: ${escapeHtml(aggregateLabel)}</p><h2>Hasil agregasi</h2><table><thead><tr><th>${escapeHtml(xColumn.name)}</th><th>${escapeHtml(aggregateLabel)}</th></tr></thead><tbody>${aggregateRows}</tbody></table><h2>Data sumber (pratinjau ${Math.min(rows.length, 100)} dari ${formatNumber(currentDataset.rows)} baris)</h2><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    notify("Laporan siap dicetak atau disimpan sebagai PDF.");
  };
  const handleSave = async () => {
    if (!currentDataset || !hasValidChart || !xColumn) {
      notify("Pilih dataset dan kolom yang valid sebelum menyimpan visualisasi.");
      return;
    }
    setSaving(true);
    try {
      await saveVisualization({
        title: displayTitle,
        datasetName: currentDataset.name,
        datasetId: currentDataset.id,
        chartType,
        xKey: effectiveXKey,
        yKey: activeAggregation === "count" && chartType !== "Scatter" ? "" : effectiveYKey,
        aggregation: activeAggregation,
        period,
        filters: chartFilters,
      });
      notify("Visualisasi disimpan ke Laporan.");
    } catch (error) {
      notify(`Visualisasi gagal disimpan: ${error instanceof Error ? error.message : "Kesalahan API."}`);
    } finally {
      setSaving(false);
    }
  };
  const reset = () => {
    const recommendation = recommendations[0];
    setSelectedChartType(recommendation?.chartType ?? "Line");
    setTitle("");
    setXKey(recommendation?.xKey ?? "");
    setYKey(recommendation?.yKey ?? "");
    setSelectedAggregation(recommendation?.aggregation ?? (numericColumns.length ? "sum" : "count"));
    notify("Konfigurasi dikembalikan ke rekomendasi dataset.");
  };
  const applyRecommendation = (index: number) => {
    const recommendation = recommendations[index];
    if (!recommendation) return;
    setSelectedChartType(recommendation.chartType);
    setTitle(recommendation.title);
    setXKey(recommendation.xKey);
    setYKey(recommendation.yKey);
    setSelectedAggregation(recommendation.aggregation);
  };

  if (datasetId !== undefined && !currentDataset) {
    return <div className="page-content visualization-page"><PageHeader title="Dataset tidak ditemukan" description="Dataset ini mungkin telah dihapus dari workspace." action={<Link href="/upload" className="button button-primary"><FileSpreadsheet size={15} /> Upload Data</Link>} /></div>;
  }

  return <div className="page-content visualization-page">
    <PageHeader title={datasetId ? currentDataset?.name ?? "Dataset" : "Visualisasi Data"} description={datasetId && currentDataset ? `${currentDataset.type} · Diunggah ${currentDataset.uploadedAt}${currentDataset.sheetName ? ` · Sheet ${currentDataset.sheetName}` : ""} · ${formatNumber(currentDataset.rows)} baris · ${formatNumber(columns.length)} kolom` : "Lihat hasil visualisasi dari dataset yang telah Anda olah."} action={<Link href="/dashboard" className="button button-outline"><ArrowLeft size={15} /> Kembali ke Dashboard</Link>} />
    {datasetId && <div className="metrics-grid dataset-metrics-grid">{datasetKpis.map(({ label, value, hint, icon: Icon, color }) => <Panel key={label} className="metric-card"><div className={`metric-icon ${color}`}><Icon size={19} strokeWidth={1.9} /></div><div className="metric-content"><span>{label}</span><strong>{value}</strong><div><small>{hint}</small></div></div></Panel>)}</div>}
    <div className="visual-toolbar"><div className="dataset-picker"><FileSpreadsheet size={16} />{datasetId && currentDataset ? <span>{currentDataset.name}</span> : currentDataset ? <select aria-label="Pilih dataset" value={currentDataset.id} onChange={(event) => { setCurrentDatasetId(event.target.value); setTitle(""); setXKey(""); setYKey(""); setPeriod("Semua Data"); }}>{datasets.map((dataset) => <option value={dataset.id} key={dataset.id}>{dataset.name}</option>)}</select> : <Link href="/upload">Upload dataset</Link>}</div><div className="visual-actions"><button className="button button-outline button-small" onClick={reset}>Reset</button><button className="button button-outline button-small" disabled={!hasValidChart} onClick={downloadChart}><Download size={14} /> Unduh PNG</button><button className="button button-outline button-small" disabled={!rows.length} onClick={() => currentDataset && downloadCsv(rows, columns, currentDataset.name.replace(/\.[^.]+$/, ".csv"))}><FileDown size={14} /> Export CSV</button><button className="button button-primary button-small" disabled={!hasValidChart || saving} onClick={() => void handleSave()}><Save size={14} /> {saving ? "Menyimpan..." : "Simpan"}</button></div></div>
    <div className="visual-layout">
      <div className="visual-main">
        <Panel className="chart-panel"><PanelHeading title={<span className="visual-heading"><TrendingUp size={19} />{displayTitle}</span>} subtitle={`${currentDataset?.name ?? "Belum ada dataset"} · ${chartLoading ? "Mengambil agregasi dari server..." : `${formatNumber(currentDataset?.rows ?? 0)} baris di server`}`} action={<SelectField value={period} options={periodOptions} onChange={(value) => setPeriod(value as ChartPeriod)} label="Periode grafik" />} /><div className="chart-type-row">{chartTypes.map((type) => <button key={type} onClick={() => setChartType(type)} className={`chart-type-button${chartType === type ? " active" : ""}`}><span>{type === "Pie" || type === "Donut" ? <PieIcon size={15} /> : type === "Line" || type === "Area" ? <LineIcon size={15} /> : <BarChart3 size={15} />}</span>{type}</button>)}</div><div className={`visual-chart${chartType === "Pie" || chartType === "Donut" ? " pie-visual-chart" : ""}${chartLoading ? " is-loading" : ""}`} ref={chartRef}>{hasValidChart ? <ChartView type={chartType} data={result.data} yColumn={activeAggregation === "count" ? undefined : yColumn} /> : <div className="empty-state"><span><BarChart3 size={23} /></span><h3>{chartLoading ? "Memuat agregasi dataset..." : chartError ? "Visualisasi gagal dimuat" : !currentDataset?.rows ? "Belum ada data untuk divisualisasikan" : "Kolom belum cocok untuk grafik ini"}</h3><p>{chartError || "Pilih kolom yang kompatibel atau unggah dataset dengan nilai yang dapat dianalisis."}</p></div>}</div><div className="chart-footnote"><span><i />{hasValidChart ? `${formatNumber(result.groupCount)} kelompok · dihitung oleh backend` : "Menunggu konfigurasi dataset yang valid"}</span><button disabled={!hasValidChart} onClick={exportReport}><FileDown size={14} /> Export laporan</button></div></Panel>
        <Panel className="raw-data-panel"><PanelHeading title="Data Mentah" subtitle="Preview data asli dari dataset Anda." action={<button className="text-link" disabled={!rows.length} onClick={() => currentDataset && downloadCsv(rows, columns, currentDataset.name.replace(/\.[^.]+$/, ".csv"))}>Unduh CSV <Download size={14} /></button>} /><DataTable key={currentDataset?.id ?? "empty"} rows={rows} columns={columns} pageSize={6} compact /></Panel>
      </div>
      <aside className="visual-aside">
        <Panel className="category-panel"><PanelHeading title={categoryColumn ? `Distribusi ${categoryColumn.name}` : "Distribusi Dataset"} subtitle={yColumn ? `Agregasi ${yColumn.name} per ${categoryColumn?.name ?? "kolom"}` : `Jumlah baris per ${categoryColumn?.name ?? "kategori"}`} />{categories.length ? <div className="category-visual"><div className="category-donut" style={{ background: categoryGradient }}><span><strong>{categoryTotal ? "100%" : "0%"}</strong><small>Total</small></span></div><div className="category-legend">{categories.map((category, index) => <div key={`${category.name}-${index}`}><i style={{ background: chartColors[index % chartColors.length] }} /><span>{category.name}</span><strong>{categoryTotal ? `${(category.value / categoryTotal * 100).toFixed(1)}%` : "0%"}</strong></div>)}</div></div> : <div className="empty-state"><span><PieIcon size={23} /></span><h3>{categoryError ? "Distribusi gagal dimuat" : "Belum ada distribusi"}</h3><p>{categoryError || "Dataset memerlukan kolom kategori yang berisi nilai."}</p></div>}</Panel>
        <Panel className="insight-panel"><PanelHeading title="Insight" subtitle="Ringkasan dari data yang Anda miliki" /><div className="insight-list"><div className="insight-item"><span className="insight-icon green"><TrendingUp size={16} /></span><div><strong>{topCategory && categoryColumn ? `${topCategory.name} ${yColumn ? "tertinggi berdasarkan" : "paling sering muncul"}` : "Kategori belum tersedia"}</strong><p>{topCategory ? `${formatDatasetValue(topCategory.value, yColumn)} · ${categoryColumn?.name}.` : "Unggah dataset dengan kolom kategori untuk melihat distribusi."}</p></div></div><div className="insight-item"><span className="insight-icon blue"><Package size={16} /></span><div><strong>{numericStats && yColumn ? `Ringkasan ${yColumn.name}` : "Kolom numerik belum tersedia"}</strong><p>{numericStats && yColumn ? `Min ${formatDatasetValue(numericStats.minimum, yColumn)} · Maks ${formatDatasetValue(numericStats.maximum, yColumn)}` : "Statistik numerik akan ditampilkan bila tersedia."}</p></div></div><div className="insight-item"><span className="insight-icon cyan"><CalendarDays size={16} /></span><div><strong>{dateRange ? `Rentang ${columns.find((column) => column.key === dateRange.columnKey)?.name ?? "tanggal"}` : "Jumlah baris"}</strong><p className="insight-total">{dateRange ? `${new Date(dateRange.start).toLocaleDateString("id-ID")} – ${new Date(dateRange.end).toLocaleDateString("id-ID")}` : formatNumber(currentDataset?.rows ?? 0)}</p></div></div></div></Panel>
        <Panel className="config-panel"><PanelHeading title="Konfigurasi" subtitle="Pilih kolom untuk grafik" /><div className="config-fields"><label>Judul grafik<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={recommendedTitle} /></label><label>Tipe grafik<SelectField value={chartType} options={chartTypes} onChange={(value) => setChartType(value as ChartType)} label="Tipe grafik" /></label><label>Sumbu X<SelectField value={effectiveXKey} options={fieldOptions(xColumns)} onChange={setXKey} label="Kolom sumbu X" /></label><label>Sumbu Y<SelectField value={activeAggregation === "count" ? "" : effectiveYKey} options={activeAggregation === "count" ? [{ value: "", label: "Jumlah baris" }] : fieldOptions(numericColumns)} onChange={setYKey} label="Kolom sumbu Y" /></label><label>Agregasi<SelectField value={activeAggregation} options={numericColumns.length ? aggregationOptions.map(({ value, label }) => ({ value, label })) : aggregationOptions.filter((option) => option.value === "count").map(({ value, label }) => ({ value, label }))} onChange={(value) => setAggregation(value as AggregationOperation)} label="Operasi agregasi" /></label><div className="config-note"><Check size={14} />{xColumn ? `X: ${xColumn.name}${yColumn && activeAggregation !== "count" ? ` · Y: ${yColumn.name}` : " · Count baris"}` : "Pilih dataset dengan kolom yang sesuai."}</div>{recommendations.length > 0 && <div className="config-fields">{recommendations.map((recommendation, index) => <button key={`${recommendation.xKey}-${recommendation.yKey}`} className="button button-outline button-small" onClick={() => applyRecommendation(index)} title={recommendation.description}>{recommendation.title}</button>)}</div>}</div></Panel>
      </aside>
    </div>
  </div>;
}
