"use client";

import { useEffect, useState } from "react";
import { Check, CircleHelp, Info, KeyRound, RotateCcw, Save } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";

export function SettingsPage() {
  const { settings, updateSettings, changePassword, notify } = useApp();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setForm(settings), 0);
    return () => window.clearTimeout(timer);
  }, [settings]);
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const save = async () => {
    setError("");
    setBusy(true);
    try {
      await updateSettings(form);
      document.documentElement.dataset.theme = form.theme === "Gelap" ? "dark" : "light";
      notify("Profil dan pengaturan berhasil disimpan.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengaturan gagal disimpan.");
    } finally {
      setBusy(false);
    }
  };
  const reset = () => { const defaults = { ...form, theme: "Terang" as const, defaultChart: "Bar", pageSize: 10 }; setForm(defaults); void updateSettings(defaults).then(() => { document.documentElement.dataset.theme = "light"; notify("Preferensi dikembalikan ke awal."); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Pengaturan gagal disimpan.")); };
  const savePassword = async () => {
    setError("");
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      notify("Password berhasil diubah.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password gagal diubah.");
    } finally {
      setBusy(false);
    }
  };
  return <div className="page-content"><PageHeader title="Pengaturan" description="Kelola preferensi aplikasi MatikSight." action={<button className="button button-primary" onClick={save}><Save size={16} /> Simpan Perubahan</button>} />
    <div className="settings-layout"><div className="settings-main">
      <Panel className="settings-panel"><PanelHeading title="Profil" subtitle="Informasi profil akun tersimpan di server" /><div className="profile-edit"><span className="avatar large">{form.name.charAt(0).toUpperCase() || "U"}</span><div><strong>Foto profil</strong><small>Avatar dibuat otomatis dari nama Anda.</small></div></div><div className="settings-fields"><label>Nama tampilan<input maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Nama Anda" /></label><label>Email<input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" placeholder="nama@email.com" /></label></div></Panel>
      <Panel className="settings-panel"><PanelHeading title="Preferensi" subtitle="Atur pengalaman kerja sesuai kebutuhan" /><div className="settings-fields"><label>Tema tampilan<SelectField value={form.theme} options={["Terang", "Gelap", "Sistem"]} onChange={(value) => update("theme", value as typeof form.theme)} label="Tema tampilan" /></label><label>Grafik default<SelectField value={form.defaultChart} options={["Bar", "Line", "Area", "Pie", "Donut", "Scatter"]} onChange={(value) => update("defaultChart", value)} label="Tipe grafik default" /></label><label>Jumlah baris tabel<SelectField value={String(form.pageSize)} options={["5", "10", "20", "50"]} onChange={(value) => update("pageSize", Number(value))} label="Jumlah baris tabel" /></label></div></Panel>
      <Panel className="settings-panel"><PanelHeading title="Keamanan akun" subtitle="Ubah password akun MatikSight" /><div className="settings-fields"><label>Password saat ini<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>Password baru<input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label></div><button className="button button-outline button-small" disabled={busy || !currentPassword || newPassword.length < 8} onClick={() => void savePassword()}><KeyRound size={14} /> Ubah Password</button></Panel>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="settings-footer"><button className="button button-quiet" disabled={busy} onClick={reset}><RotateCcw size={15} /> Reset Preferensi</button><button className="button button-primary" disabled={busy} onClick={() => void save()}><Check size={15} /> {busy ? "Menyimpan..." : "Simpan Perubahan"}</button></div>
    </div><aside className="settings-aside"><Panel className="about-card"><span className="about-logo"><span className="brand-mark"><span /><span /><span /></span></span><h3>MatikSight</h3><p>Your data, made clear.</p><div className="about-divider" /><div><small>Versi aplikasi</small><strong>v1.0.0</strong></div><div><small>Dikembangkan oleh</small><strong>Matik Creative Technology</strong></div></Panel><Panel className="help-card"><span><CircleHelp size={18} /></span><div><strong>Butuh bantuan?</strong><p>Profil tersimpan di akun; preferensi tampilan tersimpan di perangkat.</p><button className="text-link" onClick={() => notify("Dokumentasi akan segera tersedia.")}>Pusat bantuan <Info size={13} /></button></div></Panel></aside></div>
  </div>;
}
