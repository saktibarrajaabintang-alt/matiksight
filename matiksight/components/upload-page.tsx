"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, FileImage, FileSpreadsheet, FileText, Info, UploadCloud, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Panel, SelectField } from "@/components/ui";
import { Dataset, ParsedDataset } from "@/lib/data-utils";
import { buildDatasetProfile } from "@/lib/dataset-service";
import { getSpreadsheetSheetNames, parseSpreadsheet } from "@/lib/spreadsheet-utils";

type UploadKind = Dataset["type"];
type SelectedFile = { file: File; kind: UploadKind; sheets: string[]; sheetName?: string };
const allowed = [".xlsx", ".xls", ".csv", ".png", ".jpg", ".jpeg"];
const kindOptions: { name: UploadKind; description: string; icon: typeof FileSpreadsheet }[] = [
  { name: "Excel", description: "File .xlsx atau .xls", icon: FileSpreadsheet },
  { name: "CSV", description: "File .csv", icon: FileText },
  { name: "Foto Tabel", description: "Foto .png atau .jpg", icon: FileImage },
];

export function UploadPage() {
  const router = useRouter();
  const { addDataset, notify } = useApp();
  const [kind, setKind] = useState<UploadKind>("Excel");
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = async (files: FileList | File[]) => {
    setError("");
    const list = Array.from(files);
    if (!list.length) return;
    const invalid = list.find((file) => !allowed.some((extension) => file.name.toLowerCase().endsWith(extension)));
    if (invalid) {
      setError(`${invalid.name} tidak didukung. Pilih file Excel, CSV, PNG, atau JPG.`);
      return;
    }
    const oversized = list.find((file) => file.size > 20 * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.name} melebihi batas ukuran 20 MB.`);
      return;
    }
    const newFiles: SelectedFile[] = [];
    for (const file of list) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const fileKind: UploadKind = extension === "csv" ? "CSV" : ["png", "jpg", "jpeg"].includes(extension ?? "") ? "Foto Tabel" : "Excel";
      try {
        const sheets = fileKind === "Excel" ? await getSpreadsheetSheetNames(file) : [];
        newFiles.push({ file, kind: fileKind, sheets, sheetName: sheets[0] });
      } catch (reason) {
        const detail = reason instanceof Error ? reason.message : "Format file tidak dapat dibaca.";
        setError(`${file.name}: ${detail}`);
      }
    }
    setSelected((previous) => [...previous, ...newFiles].filter((entry, index, entries) => entries.findIndex((other) => other.file.name === entry.file.name && other.file.size === entry.file.size) === index));
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) void accept(event.target.files); event.target.value = ""; };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (event.dataTransfer.files) void accept(event.dataTransfer.files); };
  const addSelectedFile = async () => {
    if (!selected.length) return;
    setError("");
    setProcessing(true);
    let added = 0;
    let duplicates = 0;
    const failures: string[] = [];
    for (const entry of selected) {
      try {
        const parsed: ParsedDataset = entry.kind === "Foto Tabel"
          ? { columns: [], rows: [], totalRows: 0, profile: buildDatasetProfile([], []) }
          : await parseSpreadsheet(entry.file, entry.sheetName);
        const result = addDataset(entry.file.name, entry.file.size, entry.kind, parsed);
        if (result.duplicate) duplicates += 1;
        else added += 1;
      } catch (reason) {
        const detail = reason instanceof Error ? reason.message : "Format file tidak dapat dibaca.";
        failures.push(`${entry.file.name}: ${detail}`);
      }
    }
    setProcessing(false);
    if (added) {
      const summary = `${added} file ditambahkan${duplicates ? `, ${duplicates} duplikat diabaikan` : ""}`;
      notify(`${summary}${selected.some(({ kind: fileKind }) => fileKind === "Foto Tabel") ? ". Foto tabel belum mendukung OCR." : " dan datanya siap divisualisasikan."}`);
      router.push("/preview");
    } else if (duplicates) {
      notify(`${duplicates} dataset sudah ada di workspace; tidak ada salinan yang dibuat.`);
      router.push("/preview");
    }
    if (failures.length) setError(failures.join(" "));
  };

  return <div className="page-content">
    <PageHeader title="Upload Data" description="Masukkan data Anda dan mulai ubah menjadi visualisasi yang bermakna." />
    <div className="upload-layout">
      <Panel className="upload-panel"><div className="step-indicator"><span className="step-active">01</span><i /><span>02</span><i /><span>03</span><small>Pilih tipe <b /> Tambah file <b /> Proses</small></div>
        <h2 className="section-title">Pilih tipe data</h2><p className="section-description">Pilih format file yang ingin Anda visualisasikan.</p>
        <div className="upload-types">{kindOptions.map(({ name, description, icon: Icon }) => <button key={name} onClick={() => setKind(name)} className={`upload-type${kind === name ? " selected" : ""}`}><span className={`upload-type-icon ${name === "Foto Tabel" ? "photo" : ""}`}><Icon size={20} /></span><span><strong>{name}</strong><small>{description}</small></span><i className="radio-mark">{kind === name && <Check size={11} />}</i></button>)}</div>
        <h2 className="section-title upload-files-title">Tambahkan file</h2>
        <div className={`dropzone${error ? " has-error" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg" multiple onChange={onChange} hidden />
          <span className="drop-icon"><UploadCloud size={25} /></span><strong>Tarik file ke sini atau <em>telusuri</em></strong><p>Maksimal ukuran file 20 MB</p><small>Format yang didukung: XLSX, XLS, CSV, PNG, JPG</small>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {selected.length > 0 && <div className="selected-files">{selected.map(({ file, sheets, sheetName }) => <div className="selected-file" key={`${file.name}-${file.size}`}><span className="file-icon"><FileSpreadsheet size={16} /></span><div><strong>{file.name}</strong><small>{Math.max(1, Math.ceil(file.size / 1024))} KB · Belum diproses</small>{sheets.length > 1 && <SelectField value={sheetName ?? sheets[0]} options={sheets} onChange={(value) => setSelected((previous) => previous.map((entry) => entry.file === file ? { ...entry, sheetName: value } : entry))} label={`Pilih sheet untuk ${file.name}`} />}</div><button aria-label={`Hapus ${file.name}`} onClick={() => setSelected((previous) => previous.filter((entry) => entry.file !== file))}><X size={16} /></button></div>)}</div>}
        <div className="upload-actions"><button className="button button-quiet" disabled={processing} onClick={() => { setSelected([]); setError(""); }}>Reset</button><button className="button button-primary" disabled={!selected.length || processing} onClick={addSelectedFile}>{processing ? "Memproses..." : "Proses File"} {!processing && <ArrowRight size={16} />}</button></div>
      </Panel>
      <aside className="upload-aside"><Panel className="upload-info"><span className="info-icon"><Info size={19} /></span><h3>File spreadsheet diproses di browser</h3><p>Isi file CSV dan Excel dibaca langsung untuk membuat preview dan grafik. Foto tabel belum mendukung OCR.</p><div className="info-divider" /><div className="info-point"><span><Check size={13} /></span>File tidak dikirim ke server</div></Panel><Panel className="upload-tip"><span className="tip-label">TIPS</span><h3>Data yang rapi, insight yang jelas.</h3><p>Pastikan tabel memiliki baris header dan tidak ada kolom kosong agar hasil visualisasi lebih mudah dibaca.</p></Panel></aside>
    </div>
  </div>;
}
