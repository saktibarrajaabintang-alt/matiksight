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
  const { datasets, visualizations, settings, notify, toast, toastClosing, setCurrentDatasetId, user, authReady, authError, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<"search" | "notifications" | "user" | null>(null);
  const [closingMenu, setClosingMenu] = useState<"search" | "notifications" | "user" | null>(null);
  const [query, setQuery] = useState("");
  const [googleAdsExpanded, setGoogleAdsExpanded] = useState<boolean | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const notificationsAnchorRef = useRef<HTMLDivElement>(null);
  const userAnchorRef = useRef<HTMLDivElement>(null);
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  useEffect(() => {
    if (!authReady) return;
    if (user && isAuthRoute) router.replace("/dashboard");
    else if (!user && !isAuthRoute && !authError) router.replace("/login");
  }, [authReady, authError, isAuthRoute, router, user]);

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

  const openMenu = useCallback((nextMenu: "search" | "notifications" | "user") => {
    setClosingMenu(null);
    setMenu(nextMenu);
  }, []);
  const closeMenus = useCallback(() => {
    if (!menu || closingMenu) return;
    setClosingMenu(menu);
  }, [closingMenu, menu]);
  useEffect(() => {
    if (!closingMenu) return;
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150;
    const timeout = window.setTimeout(() => {
      setMenu((current) => current === closingMenu ? null : current);
      setClosingMenu(null);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [closingMenu]);
  const toggleMenu = (target: "notifications" | "user") => {
    if (menu === target && !closingMenu) closeMenus();
    else openMenu(target);
  };
  const dismissOutsidePopover = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!menu || !(event.target instanceof Node)) return;
    const activeAnchor = menu === "search"
      ? searchAnchorRef.current
      : menu === "notifications" ? notificationsAnchorRef.current : userAnchorRef.current;
    if (activeAnchor && !activeAnchor.contains(event.target)) closeMenus();
  };
  const handlePopoverKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      closeMenus();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchRef.current?.focus();
      openMenu("search");
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
  const handleLogout = async () => {
    closeMenus();
    try {
      await logout();
      notify("Anda berhasil keluar dari MatikSight.");
    } catch (error) {
      notify(`Sesi lokal ditutup, tetapi server tidak mengonfirmasi logout: ${error instanceof Error ? error.message : "Kesalahan API."}`);
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
        {googleAdsDatasets.length > 0 && <div className={`google-ads-subnav${showGoogleAdsChildren ? " expanded" : ""}`} aria-hidden={!showGoogleAdsChildren} inert={!showGoogleAdsChildren}><div className="google-ads-subnav-inner">{googleAdsDatasets.map(({ id, label, href }) => <Link key={id} href={href} className={`nav-link google-ads-child${pathname === href ? " active" : ""}`} onClick={() => { setCurrentDatasetId(id); setGoogleAdsExpanded(true); setMobileOpen(false); }}><FileSpreadsheet size={15} strokeWidth={1.8} /><span title={label}>{label}</span></Link>)}</div></div>}
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

  if (isAuthRoute) return <div className="auth-route">{children}{toast && <div className={`toast-message${toastClosing ? " is-closing" : ""}`} role="status"><span>i</span>{toast}</div>}</div>;
  if (!authReady || (!user && !authError)) {
    return <main className="auth-route" aria-live="polite">Memeriksa sesi MatikSight...</main>;
  }
  if (!user) {
    return <main className="auth-route" role="alert">
      <p>Tidak dapat memverifikasi sesi: {authError}</p>
      <button className="button button-primary" onClick={() => window.location.reload()}>Coba lagi</button>
    </main>;
  }

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
            <input ref={searchRef} value={query} onFocus={() => openMenu("search")} onChange={(event) => { setQuery(event.target.value); openMenu("search"); }} placeholder="Cari dataset atau visualisasi..." aria-label="Cari dataset atau visualisasi" />
            <kbd><Command size={11} /> K</kbd>
            {menu === "search" && query && (
              <div className={`floating-menu search-results${closingMenu === "search" ? " is-closing" : ""}`} inert={closingMenu === "search"}>
                {results.length ? results.map((item) => <button key={`${item.href}-${item.title}`} onClick={() => { if (item.href.startsWith("/google-ads/")) setGoogleAdsExpanded(true); router.push(item.href); closeMenus(); setQuery(""); }}><span>{item.title}<small>{item.detail}</small></span><ChevronDown size={14} className="result-arrow" /></button>) : <p className="menu-empty">Tidak ada hasil untuk “{query}”.</p>}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <div className="menu-anchor" ref={notificationsAnchorRef}>
              <button className={`icon-button${menu === "notifications" && !closingMenu ? " selected" : ""}`} aria-label="Notifikasi" aria-expanded={menu === "notifications" && !closingMenu} onClick={() => toggleMenu("notifications")}><Bell size={19} /></button>
              {menu === "notifications" && <div className={`floating-menu notification-menu${closingMenu === "notifications" ? " is-closing" : ""}`} inert={closingMenu === "notifications"}><div className="menu-heading">Notifikasi</div><p className="menu-empty">Belum ada notifikasi.</p></div>}
            </div>
            <div className="menu-anchor" ref={userAnchorRef}>
              <button className="profile-button" onClick={() => toggleMenu("user")} aria-expanded={menu === "user" && !closingMenu} aria-haspopup="menu"><span className="avatar">{settings.name.charAt(0).toUpperCase() || "U"}</span><span className="profile-name">{settings.name || "Pengguna"}</span><ChevronDown size={15} /></button>
              {menu === "user" && <div className={`floating-menu user-menu${closingMenu === "user" ? " is-closing" : ""}`} role="menu" inert={closingMenu === "user"}><button role="menuitem" onClick={() => { closeMenus(); router.push("/settings"); }}><UserRound size={16} /> Profil</button><button role="menuitem" onClick={() => { closeMenus(); router.push("/settings"); }}><Settings size={16} /> Preferensi</button><button role="menuitem" onClick={() => { closeMenus(); notify("Pusat bantuan akan segera tersedia."); }}><CircleHelp size={16} /> Bantuan</button><div className="menu-separator" /><button className="logout-menu-item" role="menuitem" onClick={() => void handleLogout()}><LogOut size={16} /> Keluar</button></div>}
            </div>
          </div>
        </header>
        <main className="page-main" onClick={() => menu === "search" && !query ? closeMenus() : undefined}>{children}</main>
      </div>
      {toast && <div className={`toast-message${toastClosing ? " is-closing" : ""}`} role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}
