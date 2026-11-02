"use client";

import { useEffect, useState } from "react";
import { Check, CircleHelp, Info, RotateCcw, Save } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";

export function SettingsPage() {
  const { settings, updateSettings, notify } = useApp();
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const save = () => {
    updateSettings(form);
    document.documentElement.dataset.theme = form.theme === "Gelap" ? "dark" : "light";
    notify("Pengaturan berhasil disimpan.");
  };
  const reset = () => { const defaults = { name: "", email: "", theme: "Terang" as const, defaultChart: "Bar", pageSize: 10 }; setForm(defaults); updateSettings(defaults); document.documentElement.dataset.theme = "light"; notify("Pengaturan dikembalikan ke awal."); };
  return <div className="page-content"><PageHeader title="Pengaturan" description="Kelola preferensi aplikasi MatikSight." action={<button className="button button-primary" onClick={save}><Save size={16} /> Simpan Perubahan</button>} />
    <div className="settings-layout"><div className="settings-main">
      <Panel className="settings-panel"><PanelHeading title="Profil" subtitle="Informasi profil lokal untuk workspace ini" /><div className="profile-edit"><span className="avatar large">{form.name.charAt(0).toUpperCase() || "U"}</span><div><strong>Foto profil</strong><small>Avatar dibuat otomatis dari nama Anda.</small></div></div><div className="settings-fields"><label>Nama tampilan<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Nama Anda" /></label><label>Email<input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" placeholder="nama@email.com" /></label></div></Panel>
      <Panel className="settings-panel"><PanelHeading title="Preferensi" subtitle="Atur pengalaman kerja sesuai kebutuhan" /><div className="settings-fields"><label>Tema tampilan<SelectField value={form.theme} options={["Terang", "Gelap", "Sistem"]} onChange={(value) => update("theme", value as typeof form.theme)} label="Tema tampilan" /></label><label>Grafik default<SelectField value={form.defaultChart} options={["Bar", "Line", "Area", "Pie", "Donut", "Scatter"]} onChange={(value) => update("defaultChart", value)} label="Tipe grafik default" /></label><label>Jumlah baris tabel<SelectField value={String(form.pageSize)} options={["5", "10", "20", "50"]} onChange={(value) => update("pageSize", Number(value))} label="Jumlah baris tabel" /></label></div></Panel>
      <div className="settings-footer"><button className="button button-quiet" onClick={reset}><RotateCcw size={15} /> Reset Pengaturan</button><button className="button button-primary" onClick={save}><Check size={15} /> Simpan Perubahan</button></div>
    </div><aside className="settings-aside"><Panel className="about-card"><span className="about-logo"><span className="brand-mark"><span /><span /><span /></span></span><h3>MatikSight</h3><p>Your data, made clear.</p><div className="about-divider" /><div><small>Versi aplikasi</small><strong>v1.0.0</strong></div><div><small>Dikembangkan oleh</small><strong>Matik Creative Technology</strong></div></Panel><Panel className="help-card"><span><CircleHelp size={18} /></span><div><strong>Butuh bantuan?</strong><p>Pengaturan ini tersimpan secara lokal di perangkat Anda.</p><button className="text-link" onClick={() => notify("Dokumentasi akan segera tersedia.")}>Pusat bantuan <Info size={13} /></button></div></Panel></aside></div>
  </div>;
}
