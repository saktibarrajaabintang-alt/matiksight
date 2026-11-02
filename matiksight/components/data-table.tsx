"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatNumber, formatRupiah, SalesRow } from "@/lib/data-utils";

type Column = { key: keyof SalesRow; label: string; align?: "left" | "right"; format?: "date" | "currency" | "number" };
const columns: Column[] = [
  { key: "id", label: "No.", format: "number" },
  { key: "tanggal", label: "Tanggal", format: "date" },
  { key: "produk", label: "Produk" },
  { key: "kategori", label: "Kategori" },
  { key: "jumlah", label: "Jumlah", align: "right", format: "number" },
  { key: "harga", label: "Harga Satuan", align: "right", format: "currency" },
  { key: "total", label: "Total", align: "right", format: "currency" },
];

export function DataTable({ rows, pageSize = 8, compact = false }: { rows: SalesRow[]; pageSize?: number; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof SalesRow>("tanggal");
  const [ascending, setAscending] = useState(false);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => !search || Object.values(row).some((value) => String(value).toLowerCase().includes(search)))
      .sort((a, b) => {
        const left = a[sortKey]; const right = b[sortKey];
        const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
        return ascending ? compared : -compared;
      });
  }, [rows, query, sortKey, ascending]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const formatCell = (row: SalesRow, column: Column) => {
    const value = row[column.key];
    if (column.format === "currency") return formatRupiah(Number(value));
    if (column.format === "number") return formatNumber(Number(value));
    if (column.format === "date") return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    return value;
  };

  return <div className={`table-wrap${compact ? " compact" : ""}`}>
    <div className="table-toolbar"><label className="table-search"><Search size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari dalam data..." aria-label="Cari dalam data" /></label><span className="table-count">{formatNumber(filtered.length)} baris data</span></div>
    <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.key} className={column.align === "right" ? "align-right" : ""}><button onClick={() => { if (sortKey === column.key) setAscending(!ascending); else { setSortKey(column.key); setAscending(true); } }}>{column.label}{sortKey === column.key && <span>{ascending ? " ↑" : " ↓"}</span>}</button></th>)}</tr></thead><tbody>
      {visible.map((row) => <tr key={row.id}><td className="row-number">{formatCell(row, columns[0])}</td><td>{formatCell(row, columns[1])}</td><td className="product-cell">{formatCell(row, columns[2])}</td><td><span className="category-chip">{formatCell(row, columns[3])}</span></td><td className="align-right">{formatCell(row, columns[4])}</td><td className="align-right">{formatCell(row, columns[5])}</td><td className="align-right total-cell">{formatCell(row, columns[6])}</td></tr>)}
      {!visible.length && <tr><td className="table-empty" colSpan={columns.length}>Tidak ada data yang cocok.</td></tr>}
    </tbody></table></div>
    <div className="table-pagination"><span>Menampilkan {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} dari {formatNumber(filtered.length)}</span><div><button disabled={page <= 1} aria-label="Halaman sebelumnya" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><span className="page-number">{page} / {pages}</span><button disabled={page >= pages} aria-label="Halaman berikutnya" onClick={() => setPage((value) => Math.min(pages, value + 1))}><ChevronRight size={16} /></button></div></div>
  </div>;
}
