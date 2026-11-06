"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DataRow, formatNumber } from "@/lib/data-utils";

export function DataTable({ rows, pageSize = 8, compact = false }: { rows: DataRow[]; pageSize?: number; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("");
  const [ascending, setAscending] = useState(true);
  const columns = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => !search || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search)))
      .toSorted((a, b) => {
        const left = a[sortKey]; const right = b[sortKey];
        const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""));
        return ascending ? compared : -compared;
      });
  }, [rows, query, sortKey, ascending]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return <div className={`table-wrap${compact ? " compact" : ""}`}>
    <div className="table-toolbar"><label className="table-search"><Search size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari dalam data..." aria-label="Cari dalam data" /></label><span className="table-count">{formatNumber(filtered.length)} baris data</span></div>
    <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}><button onClick={() => { if (sortKey === column) setAscending(!ascending); else { setSortKey(column); setAscending(true); } }}>{column}{sortKey === column && <span>{ascending ? " ↑" : " ↓"}</span>}</button></th>)}</tr></thead><tbody>
      {visible.map((row, index) => <tr key={index}>{columns.map((column, columnIndex) => <td key={column} className={columnIndex === 0 ? "row-number" : ""}>{typeof row[column] === "number" ? formatNumber(row[column] as number) : String(row[column] ?? "—")}</td>)}</tr>)}
      {!visible.length && <tr><td className="table-empty" colSpan={Math.max(columns.length, 1)}>Tidak ada data yang cocok.</td></tr>}
    </tbody></table></div>
    <div className="table-pagination"><span>Menampilkan {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} dari {formatNumber(filtered.length)}</span><div><button disabled={page <= 1} aria-label="Halaman sebelumnya" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><span className="page-number">{page} / {pages}</span><button disabled={page >= pages} aria-label="Halaman berikutnya" onClick={() => setPage((value) => Math.min(pages, value + 1))}><ChevronRight size={16} /></button></div></div>
  </div>;
}
