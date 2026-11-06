"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight, BarChart3, Eye, EyeOff, LockKeyhole, Mail, Moon, ShieldCheck,
  Sun, UserRound, Zap,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

type AuthMode = "login" | "register";
type FieldErrors = Record<string, string>;

function BrandLogo({ centered = false }: { centered?: boolean }) {
  const gradientId = useId();
  return (
    <span className={`auth-logo-lockup${centered ? " centered" : ""}`}>
      <svg className="auth-logo-mark" viewBox="0 0 56 48" role="img" aria-label="MatikSight">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#328cff" />
            <stop offset="1" stopColor="#1456d9" />
          </linearGradient>
        </defs>
        <path d="M5 40 16 8 28 30 40 8 51 40" fill="none" stroke={`url(#${gradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="9" />
      </svg>
      <span className="auth-logo-copy"><strong>MatikSight</strong><small>Excel Visualization Tool</small></span>
    </span>
  );
}

function DashboardPreview() {
  const chartPoints = "8,104 47,96 82,93 119,81 157,80 195,64 230,58 266,47 301,45 337,50 374,35 409,41";
  return (
    <div className="auth-preview-scene" aria-label="Pratinjau dashboard MatikSight">
      <div className="auth-preview-orbit" />
      <div className="auth-dashboard-preview">
        <aside className="auth-preview-sidebar">
          <div className="auth-preview-brand"><span className="auth-preview-mini-mark">M</span><strong>MatikSight</strong></div>
          <span className="auth-preview-nav selected"><i />Dashboard</span>
          <span className="auth-preview-nav"><i />Upload Data</span>
          <span className="auth-preview-nav"><i />Visualisasi</span>
          <span className="auth-preview-nav"><i />Riwayat</span>
          <span className="auth-preview-nav"><i />Pengaturan</span>
        </aside>
        <div className="auth-preview-content">
          <div className="auth-preview-search"><span />Cari dataset...</div>
          <div className="auth-preview-heading"><strong>Dashboard</strong><small>Ringkasan data dan insight terbaru Anda.</small></div>
          <div className="auth-preview-kpis">
            <div><i className="kpi-blue"><BarChart3 size={12} /></i><span>Total Dataset<strong>24</strong><small>↑ 12%</small></span></div>
            <div><i className="kpi-violet"><BarChart3 size={12} /></i><span>Total Visualisasi<strong>48</strong><small>↑ 8%</small></span></div>
            <div><i className="kpi-green"><BarChart3 size={12} /></i><span>Total Laporan<strong>12</strong><small>↑ 15%</small></span></div>
          </div>
          <div className="auth-preview-charts">
            <div className="auth-preview-line-chart">
              <strong>Tren Data</strong>
              <svg viewBox="0 0 420 125" preserveAspectRatio="none" aria-hidden="true">
                <path className="preview-grid-line" d="M0 25H420M0 62H420M0 99H420" />
                <polyline points={chartPoints} />
                {chartPoints.split(" ").map((point) => {
                  const [cx, cy] = point.split(",");
                  return <circle key={point} cx={cx} cy={cy} r="3" />;
                })}
              </svg>
              <small>Jan　　 Feb　　 Mar　　 Apr　　 Mei　　 Jun</small>
            </div>
            <div className="auth-preview-bars" aria-hidden="true">
              {[30, 43, 53, 65, 77, 89].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="auth-preview-insight"><span>↑</span><strong>+24.5%</strong></div>
    </div>
  );
}

function AuthBranding() {
  return (
    <section className="auth-branding">
      <Link href="/dashboard" className="auth-brand-link" aria-label="MatikSight">
        <BrandLogo />
      </Link>
      <div className="auth-brand-copy">
        <h1>Ubah Data Anda<br />Menjadi <span>Insight</span> Berharga</h1>
        <p>Upload, visualisasi, dan analisis data dengan mudah<br className="auth-desktop-break" /> menggunakan MatikSight.</p>
        <div className="auth-features">
          <div><span><Zap size={19} fill="currentColor" /></span><strong>Analisis Cepat<br />&amp; Akurat</strong></div>
          <div><span><BarChart3 size={19} fill="currentColor" /></span><strong>Visualisasi<br />Interaktif</strong></div>
          <div><span><ShieldCheck size={19} fill="currentColor" /></span><strong>Aman &amp;<br />Terpercaya</strong></div>
        </div>
      </div>
      <DashboardPreview />
      <footer className="auth-footer"><span><ShieldCheck size={14} fill="currentColor" />MatikSight © 2025. Dibangun oleh Matik Creative Technology</span><strong>Data Lebih Bermakna, Masa Depan Lebih Cerdas <i /></strong></footer>
    </section>
  );
}

function AuthInput({
  id, label, name, placeholder, type = "text", icon, error, autoComplete, onChange,
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  icon: ReactNode;
  error?: string;
  autoComplete?: string;
  onChange?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <span className="auth-input-icon" aria-hidden="true">{icon}</span>
        <input id={id} name={name} type={isPassword && visible ? "text" : type} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={onChange} />
        {isPassword && <button className="auth-password-toggle" type="button" onClick={() => setVisible((previous) => !previous)} aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>}
      </div>
      {error && <small id={`${id}-error`} className="auth-field-error">{error}</small>}
    </div>
  );
}

function GoogleMark() {
  return <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" /><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.1A20 20 0 0 0 24 44Z" /><path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.1H5.8a20 20 0 0 0 0 17.6l6.8-5.1Z" /><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.2l6.8 5.1c1.6-4.8 6.1-8.4 11.4-8.4Z" /></svg>;
}

function AuthCard({ children, mode }: { children: ReactNode; mode: AuthMode }) {
  return (
    <section className={`auth-card ${mode === "register" ? "register-card" : "login-card"}`}>
      <header className="auth-card-header"><BrandLogo centered /></header>
      {children}
    </section>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useApp();
  const dark = settings.theme === "Gelap" || (
    settings.theme === "Sistem"
    && typeof window !== "undefined"
    && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const toggleTheme = () => updateSettings({ theme: dark ? "Terang" : "Gelap" });
  return <main className="auth-page">
    <button className="auth-theme-toggle" type="button" onClick={toggleTheme} aria-label={`Aktifkan mode ${dark ? "terang" : "gelap"}`} aria-pressed={dark}><span>{dark ? <Sun size={17} /> : <Moon size={17} />}</span><span>{dark ? "Mode Terang" : "Mode Gelap"}</span></button>
    <div className="auth-background-shape auth-shape-one" /><div className="auth-background-shape auth-shape-two" /><div className="auth-background-shape auth-shape-three" /><div className="auth-layout"><AuthBranding /><div className="auth-card-column">{children}</div></div>
  </main>;
}

function getServiceError(error: unknown) {
  if (error instanceof Error) return error.message;
  console.error("MatikSight authentication request failed.", error);
  return "Terjadi kesalahan saat menghubungi layanan autentikasi. Silakan coba lagi.";
}

export function LoginPage() {
  const router = useRouter();
  const { login } = useApp();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: FieldErrors = {};
    if (!identifier) nextErrors.identifier = "Masukkan email atau username Anda.";
    else if (identifier.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) nextErrors.identifier = "Masukkan alamat email yang valid.";
    if (!password) nextErrors.password = "Masukkan password Anda.";
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await login(identifier, password, remember);
      router.replace("/dashboard");
    } catch (error) {
      setMessage(getServiceError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard mode="login">
        <div className="auth-title"><h2>Selamat Datang Kembali!</h2><p>Masuk ke akun Anda untuk melanjutkan</p></div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <AuthInput id="login-identifier" name="identifier" label="Email atau Username" placeholder="Masukkan email Anda" icon={<Mail size={17} />} autoComplete="username" error={errors.identifier} onChange={() => setErrors((previous) => ({ ...previous, identifier: "" }))} />
          <AuthInput id="login-password" name="password" label="Password" placeholder="Masukkan password Anda" icon={<LockKeyhole size={17} />} type="password" autoComplete="current-password" error={errors.password} onChange={() => setErrors((previous) => ({ ...previous, password: "" }))} />
          <div className="auth-form-options"><label className="auth-check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span />Ingat saya</label><button type="button" className="auth-text-button" onClick={() => setMessage("Fitur lupa password belum tersedia.")}>Lupa password?</button></div>
          {message && <p className="auth-feedback" role="alert">{message}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? <span className="auth-spinner" /> : <><span className="auth-submit-arrow"><ArrowRight size={16} /></span>Masuk</>}</button>
        </form>
        <div className="auth-divider"><span />atau<span /></div>
        <button className="auth-google" type="button" onClick={() => setMessage("Login Google belum tersedia. Silakan gunakan email atau username.")}><GoogleMark />Masuk dengan Google</button>
        <p className="auth-switch">Belum punya akun? <Link href="/register">Daftar sekarang</Link></p>
      </AuthCard>
    </AuthShell>
  );
}

export function RegisterPage() {
  const router = useRouter();
  const { register } = useApp();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    const nextErrors: FieldErrors = {};
    if (name.length < 2) nextErrors.name = "Nama lengkap minimal 2 karakter.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Masukkan alamat email yang valid.";
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) nextErrors.username = "Username 3–30 karakter, gunakan huruf, angka, atau garis bawah.";
    if (password.length < 8) nextErrors.password = "Password harus memiliki minimal 8 karakter.";
    if (confirmation !== password) nextErrors.confirmation = "Konfirmasi password tidak cocok.";
    if (!acceptedTerms) nextErrors.terms = "Setujui syarat dan ketentuan untuk melanjutkan.";
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await register({ fullName: name, email, username, password });
      router.replace("/dashboard");
    } catch (error) {
      setMessage(getServiceError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard mode="register">
        <div className="auth-title"><h2>Buat Akun Baru</h2><p>Daftar untuk mulai mengelola dan memvisualisasikan data Anda.</p></div>
        <form className="auth-form register-form" onSubmit={submit} noValidate>
          <AuthInput id="register-name" name="name" label="Nama Lengkap" placeholder="Masukkan nama lengkap Anda" icon={<UserRound size={17} />} autoComplete="name" error={errors.name} onChange={() => setErrors((previous) => ({ ...previous, name: "" }))} />
          <AuthInput id="register-email" name="email" label="Email" placeholder="Masukkan email aktif Anda" icon={<Mail size={17} />} autoComplete="email" error={errors.email} onChange={() => setErrors((previous) => ({ ...previous, email: "" }))} />
          <AuthInput id="register-username" name="username" label="Username" placeholder="Buat username Anda" icon={<UserRound size={17} />} autoComplete="username" error={errors.username} onChange={() => setErrors((previous) => ({ ...previous, username: "" }))} />
          <AuthInput id="register-password" name="password" label="Password" placeholder="Buat password" icon={<LockKeyhole size={17} />} type="password" autoComplete="new-password" error={errors.password} onChange={() => setErrors((previous) => ({ ...previous, password: "" }))} />
          <AuthInput id="register-confirmation" name="confirmation" label="Konfirmasi Password" placeholder="Ulangi password Anda" icon={<LockKeyhole size={17} />} type="password" autoComplete="new-password" error={errors.confirmation} onChange={() => setErrors((previous) => ({ ...previous, confirmation: "" }))} />
          <div className="auth-terms-wrap"><label className="auth-check auth-terms"><input type="checkbox" checked={acceptedTerms} onChange={(event) => { setAcceptedTerms(event.target.checked); if (event.target.checked) setErrors((previous) => ({ ...previous, terms: "" })); }} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? "register-terms-error" : undefined} /><span />Saya menyetujui Syarat dan Ketentuan serta Kebijakan Privasi.</label>{errors.terms && <small id="register-terms-error" className="auth-field-error">{errors.terms}</small>}</div>
          {message && <p className="auth-feedback" role="alert">{message}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? <span className="auth-spinner" /> : <>Daftar Sekarang<ArrowRight size={17} /></>}</button>
        </form>
        <div className="auth-divider"><span />atau<span /></div>
        <button className="auth-google" type="button" onClick={() => setMessage("Pendaftaran Google belum tersedia. Silakan gunakan formulir di atas.")}><GoogleMark />Daftar dengan Google</button>
        <p className="auth-switch">Sudah punya akun? <Link href="/login">Masuk sekarang</Link></p>
      </AuthCard>
    </AuthShell>
  );
}
