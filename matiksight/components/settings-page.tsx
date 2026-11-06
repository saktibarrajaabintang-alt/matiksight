"use client";

import { useEffect, useState } from "react";
import { Check, CircleHelp, Info, KeyRound, RotateCcw, Save } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Panel, PanelHeading, SelectField } from "@/components/ui";

export function SettingsPage() {
  const { settings, updateSettings, changePassword, notify } = useApp();
  const [form, setForm] = useState(settings);
  const [systemTheme, setSystemTheme] = useState<"Terang" | "Gelap">("Terang");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep unsaved settings fields synchronized with workspace hydration.
  useEffect(() => setForm((previous) => ({ ...previous, theme: settings.theme })), [settings.theme]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Apply externally saved non-theme preferences without overwriting the theme draft.
  useEffect(() => setForm((previous) => ({
    ...previous,
    name: settings.name,
    email: settings.email,
    defaultChart: settings.defaultChart,
    pageSize: settings.pageSize,
  })), [settings.name, settings.email, settings.defaultChart, settings.pageSize]);
  useEffect(() => {
    if (form.theme !== "Sistem") return;
    const syncSystemTheme = () => setSystemTheme(document.documentElement.dataset.theme === "dark" ? "Gelap" : "Terang");
    syncSystemTheme();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => mediaQuery.removeEventListener("change", syncSystemTheme);
  }, [form.theme]);
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (key === "theme") void updateSettings({ theme: value as typeof form.theme }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Preferensi gagal disimpan."));
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await updateSettings(form);
      notify("Profil dan pengaturan berhasil disimpan.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengaturan gagal disimpan.");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    const defaults = { ...form, name: settings.name, email: settings.email, theme: "Terang" as const, defaultChart: "Bar", pageSize: 10 };
    setBusy(true);
    setError("");
    try {
      await updateSettings(defaults);
      setForm(defaults);
      notify("Preferensi dikembalikan ke awal.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Preferensi gagal disimpan.");
    } finally {
      setBusy(false);
    }
  };
  const savePassword = async () => {
    setBusy(true);
    setError("");
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
  return <div className="page-content"><PageHeader title="Pengaturan" description="Kelola preferensi aplikasi MatikSight." action={<button className="button button-primary" disabled={busy} onClick={() => void save()}><Save size={16} /> Simpan Perubahan</button>} />
    <div className="settings-layout"><div className="settings-main">
      <Panel className="settings-panel"><PanelHeading title="Profil" subtitle="Informasi profil akun tersimpan di server" /><div className="profile-edit"><span className="avatar large">{form.name.charAt(0).toUpperCase() || "U"}</span><div><strong>Foto profil</strong><small>Avatar dibuat otomatis dari nama Anda.</small></div></div><div className="settings-fields"><label>Nama tampilan<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Nama Anda" /></label><label>Email<input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" placeholder="nama@email.com" /></label></div></Panel>
      <Panel className="settings-panel"><PanelHeading title="Preferensi" subtitle="Atur pengalaman kerja sesuai kebutuhan" /><div className="settings-fields"><label>Tema tampilan<SelectField value={form.theme} options={["Terang", "Gelap", "Sistem"]} onChange={(value) => update("theme", value as typeof form.theme)} label="Tema tampilan" /><small className="theme-status" aria-live="polite">Tema aktif: <strong>{form.theme === "Sistem" ? systemTheme : form.theme}</strong>{form.theme === "Sistem" ? " · Mengikuti preferensi perangkat" : ""}</small></label><label>Grafik default<SelectField value={form.defaultChart} options={["Bar", "Line", "Area", "Pie", "Donut", "Scatter"]} onChange={(value) => update("defaultChart", value)} label="Tipe grafik default" /></label><label>Jumlah baris tabel<SelectField value={String(form.pageSize)} options={["5", "10", "20", "50"]} onChange={(value) => update("pageSize", Number(value))} label="Jumlah baris tabel" /></label></div></Panel>
      <Panel className="settings-panel"><PanelHeading title="Keamanan akun" subtitle="Ubah password akun MatikSight" /><div className="settings-fields"><label>Password saat ini<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>Password baru<input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label></div><button className="button button-outline button-small" disabled={busy || !currentPassword || newPassword.length < 8} onClick={() => void savePassword()}><KeyRound size={14} /> Ubah Password</button></Panel>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="settings-footer"><button className="button button-quiet" disabled={busy} onClick={() => void reset()}><RotateCcw size={15} /> Reset Pengaturan</button><button className="button button-primary" disabled={busy} onClick={() => void save()}><Check size={15} /> {busy ? "Menyimpan..." : "Simpan Perubahan"}</button></div>
    </div><aside className="settings-aside"><Panel className="about-card"><span className="about-logo"><span className="brand-mark"><span /><span /><span /></span></span><h3>MatikSight</h3><p>Your data, made clear.</p><div className="about-divider" /><div><small>Versi aplikasi</small><strong>v1.0.0</strong></div><div><small>Dikembangkan oleh</small><strong>Matik Creative Technology</strong></div></Panel><Panel className="help-card"><span><CircleHelp size={18} /></span><div><strong>Butuh bantuan?</strong><p>Profil tersimpan di akun; preferensi tampilan tersimpan di perangkat.</p><button className="text-link" onClick={() => notify("Dokumentasi akan segera tersedia.")}>Pusat bantuan <Info size={13} /></button></div></Panel></aside></div>
  </div>;
}
