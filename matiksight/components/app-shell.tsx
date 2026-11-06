"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, ChevronDown, ChevronRight, CircleHelp, Clock3, Command, FileBarChart2,
  FileSpreadsheet, LayoutDashboard, LogOut, Megaphone, Menu, Search, Settings, UserRound, X,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload Data", href: "/upload", icon: FileSpreadsheet },
  { label: "Riwayat", href: "/history", icon: Clock3 },
  { label: "Laporan", href: "/reports", icon: FileBarChart2 },
  { label: "Visualisasi", href: "/visualization", icon: BarChart3 },
  { label: "Pengaturan", href: "/settings", icon: Settings },
];

function getDatasetLabel(name: string) {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension.replace(/[_-]+/g, " ").trim();
  return normalized.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("id-ID")) || name;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { datasets, visualizations, settings, notify, toast, setCurrentDatasetId, token, authReady, logout: endSession } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<"search" | "notifications" | "user" | null>(null);
  const [query, setQuery] = useState("");
  const [googleAdsExpanded, setGoogleAdsExpanded] = useState<boolean | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const notificationsAnchorRef = useRef<HTMLDivElement>(null);
  const userAnchorRef = useRef<HTMLDivElement>(null);
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  useEffect(() => {
    if (!authReady) return;
    if (!token && !isAuthRoute) router.replace("/login");
    else if (token && isAuthRoute) router.replace("/dashboard");
  }, [authReady, isAuthRoute, router, token]);
  const googleAdsDatasets = useMemo(() => {
    const labels = new Map<string, number>();
    return datasets
      .filter((dataset) => dataset.type !== "Foto Tabel" && dataset.status === "Selesai" && !!dataset.columns?.length)
      .map((dataset) => {
        const label = getDatasetLabel(dataset.name);
        const occurrence = (labels.get(label) ?? 0) + 1;
        labels.set(label, occurrence);
        return {
          id: dataset.id,
          label: occurrence === 1 ? label : `${label} (${occurrence})`,
          href: `/google-ads/${encodeURIComponent(dataset.id)}`,
        };
      });
  }, [datasets]);

  const closeMenus = useCallback(() => setMenu(null), []);
  const dismissOutsidePopover = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!menu || !(event.target instanceof Node)) return;
    const activeAnchor = menu === "search"
      ? searchAnchorRef.current
      : menu === "notifications" ? notificationsAnchorRef.current : userAnchorRef.current;
    if (activeAnchor && !activeAnchor.contains(event.target)) setMenu(null);
  };
  const handlePopoverKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setMenu(null);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchRef.current?.focus();
      setMenu("search");
    }
  };

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return [
      ...datasets.filter((item) => item.name.toLowerCase().includes(term)).map((item) => ({
        title: item.name,
        href: item.type !== "Foto Tabel" && item.status === "Selesai" && item.columns?.length
          ? `/google-ads/${encodeURIComponent(item.id)}`
          : "/preview",
        detail: "Dataset",
      })),
      ...visualizations.filter((item) => item.title.toLowerCase().includes(term)).map((item) => ({ title: item.title, href: "/reports", detail: "Visualisasi" })),
    ].slice(0, 5);
  }, [datasets, visualizations, query]);

  const googleAdsActive = pathname.startsWith("/google-ads");
  const showGoogleAdsChildren = googleAdsExpanded ?? googleAdsActive;
  const logout = async () => {
    closeMenus();
    try {
      await endSession();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Logout gagal.");
    } finally {
      router.replace("/login");
    }
  };
  const navContent = (
    <>
      <Link href="/dashboard" className="brand-lockup" onClick={() => setMobileOpen(false)}>
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span><strong>MatikSight</strong><small>Excel Visualization Tool</small></span>
      </Link>
      <nav className="side-nav" aria-label="Navigasi utama">
        <span className="nav-caption">WORKSPACE</span>
        <Link href="/dashboard" className={`nav-link${pathname === "/dashboard" ? " active" : ""}`} onClick={() => setMobileOpen(false)}><LayoutDashboard size={18} strokeWidth={1.8} /><span>Dashboard</span></Link>
        <Link href="/upload" className={`nav-link${pathname === "/upload" ? " active" : ""}`} onClick={() => setMobileOpen(false)}><FileSpreadsheet size={18} strokeWidth={1.8} /><span>Upload Data</span></Link>
        <button type="button" className={`nav-link nav-parent${googleAdsActive ? " active" : ""}`} onClick={() => setGoogleAdsExpanded(!showGoogleAdsChildren)} aria-expanded={showGoogleAdsChildren}>
          <Megaphone size={18} strokeWidth={1.8} /><span>Google Ads</span>{googleAdsDatasets.length > 0 && <span className="nav-count">{googleAdsDatasets.length}</span>}<ChevronRight className="nav-chevron" size={15} />
        </button>
        {showGoogleAdsChildren && googleAdsDatasets.length > 0 && <div className="google-ads-subnav">{googleAdsDatasets.map(({ id, label, href }) => <Link key={id} href={href} className={`nav-link google-ads-child${pathname === href ? " active" : ""}`} onClick={() => { setCurrentDatasetId(id); setGoogleAdsExpanded(true); setMobileOpen(false); }}><FileSpreadsheet size={15} strokeWidth={1.8} /><span title={label}>{label}</span></Link>)}</div>}
        {navigation.slice(2).map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`} onClick={() => setMobileOpen(false)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{href === "/reports" && visualizations.length > 0 && <span className="nav-count">{visualizations.length}</span>}</Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <span className="sidebar-version">MatikSight <b>v1.0.0</b></span>
        <span>by Matik Creative Technology</span>
      </div>
    </>
  );

  if (isAuthRoute) return <div className="auth-route">{children}{toast && <div className="toast-message" role="status"><span>i</span>{toast}</div>}</div>;

  return (
    <div className={`app-shell${pathname === "/dashboard" ? " dashboard-active" : ""}`} onClickCapture={dismissOutsidePopover} onKeyDownCapture={handlePopoverKeyDown}>
      <aside className="sidebar">{navContent}</aside>
      {mobileOpen && <button className="mobile-backdrop" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`mobile-sidebar${mobileOpen ? " open" : ""}`}>
        <button className="mobile-close" aria-label="Tutup menu" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        {navContent}
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Buka menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="global-search" ref={searchAnchorRef}>
            <Search size={17} />
            <input ref={searchRef} value={query} onFocus={() => setMenu("search")} onChange={(event) => { setQuery(event.target.value); setMenu("search"); }} placeholder="Cari dataset atau fitur..." aria-label="Cari dataset atau visualisasi" />
            <kbd><Command size={11} /> K</kbd>
            {menu === "search" && query && (
              <div className="floating-menu search-results">
                {results.length ? results.map((item) => <button key={`${item.href}-${item.title}`} onClick={() => { if (item.href.startsWith("/google-ads/")) setGoogleAdsExpanded(true); router.push(item.href); closeMenus(); setQuery(""); }}><span>{item.title}<small>{item.detail}</small></span><ChevronDown size={14} className="result-arrow" /></button>) : <p className="menu-empty">Tidak ada hasil untuk “{query}”.</p>}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <div className="menu-anchor" ref={notificationsAnchorRef}>
              <button className={`icon-button${menu === "notifications" ? " selected" : ""}`} aria-label="Notifikasi" aria-expanded={menu === "notifications"} onClick={() => setMenu((previous) => previous === "notifications" ? null : "notifications")}><Bell size={19} /></button>
              {menu === "notifications" && <div className="floating-menu notification-menu"><div className="menu-heading">Notifikasi</div><p className="menu-empty">Belum ada notifikasi.</p></div>}
            </div>
            <div className="menu-anchor" ref={userAnchorRef}>
              <button className="profile-button" onClick={() => setMenu((previous) => previous === "user" ? null : "user")} aria-expanded={menu === "user"} aria-haspopup="menu"><span className="avatar">{settings.name.charAt(0).toUpperCase() || "U"}</span><span className="profile-name">{settings.name || "Pengguna"}</span><ChevronDown size={15} /></button>
              {menu === "user" && <div className="floating-menu user-menu" role="menu"><button role="menuitem" onClick={() => { closeMenus(); router.push("/settings"); }}><UserRound size={16} /> Profil</button><button role="menuitem" onClick={() => { closeMenus(); router.push("/settings"); }}><Settings size={16} /> Preferensi</button><button role="menuitem" onClick={() => { closeMenus(); notify("Pusat bantuan akan segera tersedia."); }}><CircleHelp size={16} /> Bantuan</button><div className="menu-separator" /><button className="logout-menu-item" role="menuitem" onClick={logout}><LogOut size={16} /> Keluar</button></div>}
            </div>
          </div>
        </header>
        <main className="page-main" onClick={() => menu === "search" && !query ? setMenu(null) : undefined}>{children}</main>
      </div>
      {toast && <div className="toast-message" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}
