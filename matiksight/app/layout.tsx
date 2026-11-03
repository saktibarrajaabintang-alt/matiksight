import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AppProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
import "../components/auth-pages.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MatikSight — Your data, made clear",
  description: "Visualisasikan data Excel Anda dengan mudah dan profesional.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <Script id="theme-bootstrap" strategy="beforeInteractive">{`
          (function () {
            try {
              var saved = localStorage.getItem("matiksight-workspace-v2") || localStorage.getItem("matiksight-workspace-v1");
              var theme = saved ? JSON.parse(saved).settings?.theme : "Terang";
              var dark = theme === "Gelap" || (theme === "Sistem" && window.matchMedia("(prefers-color-scheme: dark)").matches);
              document.documentElement.dataset.theme = dark ? "dark" : "light";
            } catch (error) {
              console.error("Could not initialize MatikSight theme from local storage.", error);
            }
          })();
        `}</Script>
        <AppProvider><AppShell>{children}</AppShell></AppProvider>
      </body>
    </html>
  );
}
