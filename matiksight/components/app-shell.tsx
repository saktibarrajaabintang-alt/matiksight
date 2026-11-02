"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, ChevronDown, CircleHelp, Clock3, Command, FileBarChart2,
  FileSpreadsheet, LayoutDashboard, Menu, Search, Settings, UserRound, X,
} from "lucide-react";
import { useApp } from "@/components/app-provider";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload Data", href: "/upload", icon: FileSpreadsheet },
  { label: "Visualisasi", href: "/visualization", icon: BarChart3 },
  { label: "Riwayat", href: "/history", icon: Clock3 },
  { label: "Laporan", href: "/reports", icon: FileBarChart2 },
  { label: "Pengaturan", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { datasets, visualizations, settings, notify, toast } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<"search" | "notifications" | "user" | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setMenu("search");
      }
      if (event.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return [
      ...datasets.filter((item) => item.name.toLowerCase().includes(term)).map((item) => ({ title: item.name, href: "/preview", detail: "Dataset" })),
      ...visualizations.filter((item) => item.title.toLowerCase().includes(term)).map((item) => ({ title: item.title, href: "/reports", detail: "Visualisasi" })),
    ].slice(0, 5);
  }, [datasets, visualizations, query]);

  const closeMenus = () => setMenu(null);
  const navContent = (
    <>
      <Link href="/dashboard" className="brand-lockup" onClick={() => setMobileOpen(false)}>
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span><strong>MatikSight</strong><small>Excel Visualization Tool</small></span>
      </Link>
      <nav className="side-nav" aria-label="Navigasi utama">
        <span className="nav-caption">WORKSPACE</span>
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`} onClick={() => setMobileOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {href === "/reports" && visualizations.length > 0 && <span className="nav-count">{visualizations.length}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <span className="sidebar-version">MatikSight <b>v1.0.0</b></span>
        <span>by Matik Creative Technology</span>
      </div>
    </>
  );

  return (
    <div className={`app-shell${pathname === "/dashboard" ? " dashboard-active" : ""}`}>
      <aside className="sidebar">{navContent}</aside>
      {mobileOpen && <button className="mobile-backdrop" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`mobile-sidebar${mobileOpen ? " open" : ""}`}>
        <button className="mobile-close" aria-label="Tutup menu" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        {navContent}
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Buka menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="global-search">
            <Search size={17} />
            <input ref={searchRef} value={query} onFocus={() => setMenu("search")} onChange={(event) => { setQuery(event.target.value); setMenu("search"); }} placeholder="Cari dataset atau fitur..." aria-label="Cari dataset atau visualisasi" />
            <kbd><Command size={11} /> K</kbd>
            {menu === "search" && query && (
              <div className="floating-menu search-results">
                {results.length ? results.map((item) => <button key={`${item.href}-${item.title}`} onClick={() => { router.push(item.href); closeMenus(); setQuery(""); }}><span>{item.title}<small>{item.detail}</small></span><ChevronDown size={14} className="result-arrow" /></button>) : <p className="menu-empty">Tidak ada hasil untuk “{query}”.</p>}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <div className="menu-anchor">
              <button className={`icon-button${menu === "notifications" ? " selected" : ""}`} aria-label="Notifikasi" onClick={() => setMenu(menu === "notifications" ? null : "notifications")}><Bell size={19} /></button>
              {menu === "notifications" && <div className="floating-menu notification-menu"><div className="menu-heading">Notifikasi</div><p className="menu-empty">Belum ada notifikasi.</p></div>}
            </div>
            <div className="menu-anchor">
              <button className="profile-button" onClick={() => setMenu(menu === "user" ? null : "user")} aria-expanded={menu === "user"}><span className="avatar">{settings.name.charAt(0).toUpperCase() || "U"}</span><span className="profile-name">{settings.name || "Pengguna"}</span><ChevronDown size={15} /></button>
              {menu === "user" && <div className="floating-menu user-menu"><button onClick={() => { router.push("/settings"); closeMenus(); }}><UserRound size={16} /> Profil</button><button onClick={() => { router.push("/settings"); closeMenus(); }}><Settings size={16} /> Preferensi</button><button onClick={() => { notify("Pusat bantuan akan segera tersedia."); closeMenus(); }}><CircleHelp size={16} /> Bantuan</button></div>}
            </div>
          </div>
        </header>
        <main className="page-main" onClick={() => menu === "search" && !query ? setMenu(null) : undefined}>{children}</main>
      </div>
      {toast && <div className="toast-message" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}
