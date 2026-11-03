"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  DatasetColumn,
  DatasetRecord,
  formatDatasetValue,
  formatNumber,
  getNumericValue,
  getColumnIndex,
} from "@/lib/data-utils";

export function DataTable({
  rows,
  columns,
  pageSize = 8,
  compact = false,
}: {
  rows: DatasetRecord[];
  columns: DatasetColumn[];
  pageSize?: number;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("");
  const [ascending, setAscending] = useState(true);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !search || row.some((value) => String(value ?? "").toLowerCase().includes(search)))
      .sort((left, right) => {
        const column = columns.find((item) => item.key === sortKey);
        if (!column) return left.index - right.index;
        const leftValue = left.row[getColumnIndex(column)];
        const rightValue = right.row[getColumnIndex(column)];
        const leftNumber = getNumericValue(leftValue, column.type);
        const rightNumber = getNumericValue(rightValue, column.type);
        const compared = leftNumber !== undefined && rightNumber !== undefined
          ? leftNumber - rightNumber
          : String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
        return ascending ? compared : -compared;
      });
  }, [rows, columns, query, sortKey, ascending]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return <div className={`table-wrap${compact ? " compact" : ""}`}>
    <div className="table-toolbar"><label className="table-search"><Search size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari dalam data..." aria-label="Cari dalam data" /></label><span className="table-count">{formatNumber(filtered.length)} baris data</span></div>
    <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.key}><button onClick={() => { if (sortKey === column.key) setAscending(!ascending); else { setSortKey(column.key); setAscending(true); } }}>{column.name}{sortKey === column.key && <span>{ascending ? " ↑" : " ↓"}</span>}</button></th>)}</tr></thead><tbody>
      {visible.map(({ row, index }) => <tr key={index}>{columns.map((column) => <td key={column.key}>{formatDatasetValue(row[getColumnIndex(column)], column)}</td>)}</tr>)}
      {!visible.length && <tr><td className="table-empty" colSpan={Math.max(columns.length, 1)}>{rows.length ? "Tidak ada data yang cocok." : columns.length ? "Dataset belum memiliki baris data." : "Dataset belum memiliki kolom yang dapat ditampilkan."}</td></tr>}
    </tbody></table></div>
    <div className="table-pagination"><span>Menampilkan {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} dari {formatNumber(filtered.length)}</span><div><button disabled={page <= 1} aria-label="Halaman sebelumnya" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><span className="page-number">{page} / {pages}</span><button disabled={page >= pages} aria-label="Halaman berikutnya" onClick={() => setPage((value) => Math.min(pages, value + 1))}><ChevronRight size={16} /></button></div></div>
  </div>;
}
