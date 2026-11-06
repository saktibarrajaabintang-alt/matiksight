"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, FileSpreadsheet, FileText, Info, UploadCloud, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Panel } from "@/components/ui";
import { Dataset } from "@/lib/data-utils";

type UploadKind = Dataset["type"];
type SelectedFile = { file: File; kind: UploadKind };
const allowed = [".xlsx", ".xls", ".csv"];
const kindOptions: { name: UploadKind; description: string; icon: typeof FileSpreadsheet }[] = [
  { name: "Excel", description: "File .xlsx atau .xls", icon: FileSpreadsheet },
  { name: "CSV", description: "File .csv", icon: FileText },
];

export function UploadPage() {
  const router = useRouter();
  const { addDataset, notify } = useApp();
  const [kind, setKind] = useState<UploadKind>("Excel");
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (files: FileList | File[]) => {
    setError("");
    const list = Array.from(files);
    if (!list.length) return;
    const invalid = list.find((file) => !allowed.some((extension) => file.name.toLowerCase().endsWith(extension)));
    if (invalid) {
      setError(`${invalid.name} tidak didukung. Pilih file Excel atau CSV.`);
      return;
    }
    const newFiles = list.map((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const fileKind: UploadKind = extension === "csv" ? "CSV" : "Excel";
      if (file.size > 20 * 1024 * 1024) setError(`${file.name} melebihi batas ukuran 20 MB.`);
      return { file, kind: fileKind };
    });
    if (newFiles.some(({ file }) => file.size > 20 * 1024 * 1024)) return;
    setSelected((previous) => [...previous, ...newFiles].filter((entry, index, entries) => entries.findIndex((other) => other.file.name === entry.file.name && other.file.size === entry.file.size) === index));
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) accept(event.target.files); event.target.value = ""; };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (event.dataTransfer.files) accept(event.dataTransfer.files); };
  const addSelectedFile = async () => {
    if (!selected.length) return;
    setBusy(true);
    setError("");
    try {
      for (const entry of selected) await addDataset(entry.file);
      notify(`${selected.length} file berhasil diunggah dan diproses.`);
      router.push("/history");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload gagal.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="page-content">
    <PageHeader title="Upload Data" description="Masukkan data Anda dan mulai ubah menjadi visualisasi yang bermakna." />
    <div className="upload-layout">
      <Panel className="upload-panel"><div className="step-indicator"><span className="step-active">01</span><i /><span>02</span><i /><span>03</span><small>Pilih tipe <b /> Tambah file <b /> Proses</small></div>
        <h2 className="section-title">Pilih tipe data</h2><p className="section-description">Pilih format file yang ingin Anda visualisasikan.</p>
        <div className="upload-types">{kindOptions.map(({ name, description, icon: Icon }) => <button key={name} onClick={() => setKind(name)} className={`upload-type${kind === name ? " selected" : ""}`}><span className={`upload-type-icon ${name === "Foto Tabel" ? "photo" : ""}`}><Icon size={20} /></span><span><strong>{name}</strong><small>{description}</small></span><i className="radio-mark">{kind === name && <Check size={11} />}</i></button>)}</div>
        <h2 className="section-title upload-files-title">Tambahkan file</h2>
        <div className={`dropzone${error ? " has-error" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" multiple onChange={onChange} hidden />
          <span className="drop-icon"><UploadCloud size={25} /></span><strong>Tarik file ke sini atau <em>telusuri</em></strong><p>Maksimal ukuran file 20 MB per file</p><small>Format yang didukung: XLSX, XLS, CSV</small>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {selected.length > 0 && <div className="selected-files">{selected.map(({ file }) => <div className="selected-file" key={`${file.name}-${file.size}`}><span className="file-icon"><FileSpreadsheet size={16} /></span><div><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(0)} KB · Belum diproses</small></div><button aria-label={`Hapus ${file.name}`} onClick={() => setSelected((previous) => previous.filter((entry) => entry.file !== file))}><X size={16} /></button></div>)}</div>}
        <div className="upload-actions"><button className="button button-quiet" disabled={busy} onClick={() => { setSelected([]); setError(""); }}>Reset</button><button className="button button-primary" disabled={!selected.length || busy} onClick={() => void addSelectedFile()}>{busy ? "Mengunggah..." : "Upload dan Proses"} <ArrowRight size={16} /></button></div>
      </Panel>
      <aside className="upload-aside"><Panel className="upload-info"><span className="info-icon"><Info size={19} /></span><h3>File diproses oleh backend</h3><p>Dataset dan baris data disimpan pada akun Anda. Upload menerima CSV, XLSX, atau XLS hingga 20 MB.</p><div className="info-divider" /><div className="info-point"><span><Check size={13} /></span>Pratinjau dan profil dibuat otomatis</div></Panel><Panel className="upload-tip"><span className="tip-label">TIPS</span><h3>Data yang rapi, insight yang jelas.</h3><p>Pastikan tabel memiliki baris header dan tidak ada kolom kosong agar hasil visualisasi lebih mudah dibaca.</p></Panel></aside>
    </div>
  </div>;
}
