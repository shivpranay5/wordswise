"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/app-context";
import Login from "./Login";

const NAV = [
  { href: "/", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/study", label: "Study", icon: "M4 5h11a3 3 0 013 3v11H7a3 3 0 01-3-3V5zM8 9h6M8 13h6" },
  { href: "/play", label: "Play", icon: "M7 8h10a4 4 0 014 4v1a4 4 0 01-7 2.6h-4A4 4 0 013 13v-1a4 4 0 014-4zM8 11v3M6.5 12.5h3M15 12h.01M17 14h.01" },
  { href: "/words", label: "Words", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/stats", label: "Progress", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { ready, needsLogin, syncError } = useApp();
  const path = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted">
        <div className="animate-pulse font-serif text-2xl">WordWise</div>
      </div>
    );
  }
  if (needsLogin) return <Login />;

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
          Word<span className="text-accent">Wise</span>
        </Link>
        <nav className="hidden gap-1 sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${isActive(n.href) ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/settings" aria-label="Settings" className="rounded-lg p-2 text-muted hover:text-ink">
          <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </Link>
      </header>
      {syncError && (
        <div className="mx-4 mt-3 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">Sync problem: {syncError}</div>
      )}
      <main className="flex-1 px-4 pb-28 pt-4 sm:pb-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl justify-around">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive(n.href) ? "text-accent" : "text-muted"}`}
            >
              <Icon d={n.icon} />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
