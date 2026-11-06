"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useApp();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({ fullName, username, email, password });
      router.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pendaftaran gagal.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-page"><section className="auth-card">
    <Link href="/login" className="brand-lockup"><span className="brand-mark"><span /><span /><span /></span><span><strong>MatikSight</strong><small>Excel Visualization Tool</small></span></Link>
    <h1>Buat akun</h1><p>Daftar untuk menyimpan dataset dan visualisasi Anda.</p>
    <form className="auth-form" onSubmit={submit}>
      <label>Nama lengkap<input autoComplete="name" maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Username<input autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9_]{3,30}" required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
      <label>Email<input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Memproses..." : "Daftar dan masuk"}</button>
    </form>
    <p className="auth-switch">Sudah punya akun? <Link href="/login">Masuk</Link></p>
  </section></main>;
}
