"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LifeBuoy, Upload } from "lucide-react";
import { useHiring } from "./HiringProvider";

export function AppHeader() {
  const pathname = usePathname();
  const { candidates, hydrated } = useHiring();
  const count = hydrated ? candidates.length : 0;

  const tab = (href: string, label: string, Icon: typeof Upload, active: boolean, badge?: number) => (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-canvas text-ink" : "text-muted hover:text-ink"
      }`}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
      {badge ? <span className="rounded-full bg-brand px-1.5 text-[11px] leading-5 font-semibold text-brand-ink tabular-nums">{badge}</span> : null}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-ink">
            <LifeBuoy className="size-4.5" />
          </span>
          Hiring SOS
        </Link>
        <nav className="flex items-center gap-1">
          {tab("/", "Screen", Upload, pathname === "/")}
          {tab("/dashboard", "Candidates", LayoutGrid, pathname !== "/", count)}
        </nav>
      </div>
    </header>
  );
}
