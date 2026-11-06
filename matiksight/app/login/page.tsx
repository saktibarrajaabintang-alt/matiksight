"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(identifier, password);
      router.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login gagal.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-page"><section className="auth-card">
    <Link href="/login" className="brand-lockup"><span className="brand-mark"><span /><span /><span /></span><span><strong>MatikSight</strong><small>Excel Visualization Tool</small></span></Link>
    <h1>Masuk ke akun</h1><p>Gunakan akun MatikSight untuk membuka workspace Anda.</p>
    <form className="auth-form" onSubmit={submit}>
      <label>Username atau email<input autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Memproses..." : "Masuk"}</button>
    </form>
    <p className="auth-switch">Belum punya akun? <Link href="/register">Daftar</Link></p>
  </section></main>;
}
