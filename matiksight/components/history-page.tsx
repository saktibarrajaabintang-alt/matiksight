"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, BarChart3, Eye, FileSpreadsheet, Search, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Panel, PanelHeading, SelectField, StatusBadge } from "@/components/ui";
import { formatNumber } from "@/lib/data-utils";

export function HistoryPage() {
  const router = useRouter();
  const { datasets, currentDataset, setCurrentDatasetId, removeDataset, notify } = useApp();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Semua tipe");
  const [status, setStatus] = useState("Semua status");
  const [descending, setDescending] = useState(true);
  const filtered = useMemo(() => datasets.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && (type === "Semua tipe" || item.type === type) && (status === "Semua status" || item.status === status)), [datasets, query, type, status]).toSorted((a, b) => {
    const difference = Date.parse(a.createdAt ?? "") - Date.parse(b.createdAt ?? "");
    const order = Number.isFinite(difference) ? difference : a.id.localeCompare(b.id);
    return descending ? -order : order;
  });
  const openDataset = (id: string, path: string) => { setCurrentDatasetId(id); router.push(path); };
  const deleteDataset = async (id: string, name: string) => {
    if (!window.confirm(`Hapus dataset “${name}” dari riwayat?`)) return;
    try {
      await removeDataset(id);
      notify("Dataset dihapus dari riwayat.");
    } catch (error) {
      notify(`Dataset gagal dihapus: ${error instanceof Error ? error.message : "Kesalahan API."}`);
    }
  };

  return <div className="page-content"><PageHeader title="Riwayat Aktivitas" description="Lihat aktivitas upload dan pemrosesan dataset Anda." action={<button className="button button-primary" onClick={() => router.push("/upload")}><FileSpreadsheet size={16} /> Upload Data</button>} />
    <Panel className="history-panel"><PanelHeading title="Riwayat dataset" subtitle={`${datasets.length} file dalam akun Anda`} /><div className="history-filters"><label className="table-search"><Search size={15} /><input placeholder="Cari nama file..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><SelectField value={type} options={["Semua tipe", "Excel", "CSV"]} onChange={setType} label="Filter tipe file" /><SelectField value={status} options={["Semua status", "Belum diproses", "Selesai", "Diproses", "Gagal"]} onChange={setStatus} label="Filter status" /></div><div className="table-scroll"><table className="history-table"><thead><tr><th>Nama File</th><th>Tipe</th><th><button onClick={() => setDescending(!descending)}>Diunggah <ArrowUpDown size={12} /></button></th><th>Ukuran</th><th>Baris</th><th>Kolom</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{filtered.map((dataset) => <tr key={dataset.id}><td><button className="history-file" onClick={() => openDataset(dataset.id, "/preview")}><span className="file-icon"><FileSpreadsheet size={16} /></span><strong>{dataset.name}</strong></button></td><td>{dataset.type}</td><td>{dataset.uploadedAt}</td><td>{dataset.size} KB</td><td>{formatNumber(dataset.rows)}</td><td>{formatNumber(dataset.columns?.length ?? 0)}</td><td><StatusBadge>{dataset.status}</StatusBadge></td><td><div className="history-actions"><button title="Buka dataset" onClick={() => openDataset(dataset.id, "/preview")}><Eye size={15} /></button><button title="Gunakan di visualisasi" onClick={() => openDataset(dataset.id, "/visualization")}><BarChart3 size={15} /></button><button title="Hapus dataset" onClick={() => void deleteDataset(dataset.id, dataset.name)}><Trash2 size={15} /></button></div></td></tr>)}{!filtered.length && <tr><td className="table-empty" colSpan={8}>{datasets.length ? "Tidak ada dataset yang cocok dengan filter." : "Belum ada dataset. Unggah file untuk memulai."}</td></tr>}</tbody></table></div><div className="table-pagination"><span>Menampilkan {filtered.length} dari {datasets.length} dataset</span><span>{currentDataset ? `Aktif: ${currentDataset.name}` : ""}</span></div></Panel>
  </div>;
}
