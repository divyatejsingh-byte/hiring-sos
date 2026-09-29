"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarCheck, Eye, Inbox, Loader2, MailX, Plus, RotateCw, Search, Sparkles, Trash2 } from "lucide-react";
import { CandidateCard } from "@/components/CandidateCard";
import { useHiring } from "@/components/HiringProvider";
import { TIER_META, tierFor, type Tier } from "@/lib/scoring";
import type { CandidateStatus } from "@/lib/types";

const TIERS: Tier[] = ["strong", "borderline", "weak"];
const PIPELINE: {
  status: CandidateStatus;
  label: string;
  hint: string;
  Icon: typeof Inbox;
  tone: string;
  bar: string;
}[] = [
  { status: "invited", label: "Invites sent", hint: "Interview invitation emailed", Icon: CalendarCheck, tone: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  { status: "review_pending", label: "Under review", hint: "Opened, no email sent yet", Icon: Eye, tone: "text-violet-600 dark:text-violet-400", bar: "bg-violet-500" },
  { status: "rejected", label: "Rejections sent", hint: "Rejection email sent", Icon: MailX, tone: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500" },
  { status: "new", label: "Not opened yet", hint: "Screened, waiting for you", Icon: Sparkles, tone: "text-sky-600 dark:text-sky-400", bar: "bg-sky-500" },
];

const STATUS_FILTERS: { value: CandidateStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "review_pending", label: "Review Pending" },
  { value: "invited", label: "Invited" },
  { value: "rejected", label: "Rejected" },
];

export default function DashboardPage() {
  const { candidates, hydrated, loadError, reload, clearSession, notify } = useHiring();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CandidateStatus | "all">("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: candidates.length };
    for (const c of candidates) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [candidates]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = candidates
      .filter((c) => status === "all" || c.status === status)
      .filter(
        (c) =>
          !q ||
          c.result.contact.name.toLowerCase().includes(q) ||
          c.result.contact.email?.toLowerCase().includes(q) ||
          c.fileName.toLowerCase().includes(q),
      )
      .sort((a, b) => b.result.weighted_score - a.result.weighted_score);
    return TIERS.map((tier) => ({ tier, items: visible.filter((c) => tierFor(c.result.weighted_score) === tier) }));
  }, [candidates, query, status]);

  if (!hydrated) {
    return (
      <main className="grid place-items-center px-4 py-24 text-muted">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  }

  if (loadError && candidates.length === 0) {
    return (
      <main className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
        <AlertTriangle className="size-10 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Couldn&apos;t load your candidates</h1>
        <p className="mt-1 text-sm text-muted">{loadError}</p>
        <button onClick={() => void reload()} className="btn btn-outline mt-6">
          <RotateCw className="size-4" /> Try again
        </button>
      </main>
    );
  }

  if (candidates.length === 0) {
    return (
      <main className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-surface text-muted ring-1 ring-line">
          <Inbox className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink">No candidates yet</h1>
        <p className="mt-1 text-sm text-muted">Screen a batch of resumes and the ranked shortlist will appear here.</p>
        <Link href="/" className="btn btn-primary mt-6">
          <Plus className="size-4" /> Screen resumes
        </Link>
      </main>
    );
  }

  const tierTotals = TIERS.map((t) => candidates.filter((c) => tierFor(c.result.weighted_score) === t).length);
  const actioned = (statusCounts.invited ?? 0) + (statusCounts.rejected ?? 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Candidates</h1>
          <p className="mt-1 text-sm text-muted">
            {actioned} of {candidates.length} replied to
            {candidates.length - actioned > 0 && ` · ${candidates.length - actioned} still waiting on you`}
          </p>
        </div>
        <div className="flex gap-2">
          {confirmClear ? (
            <div className="animate-fade-in flex items-center gap-2">
              <span className="text-sm text-muted">Delete all {candidates.length} permanently?</span>
              <button onClick={() => setConfirmClear(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button
                disabled={clearing}
                onClick={async () => {
                  setClearing(true);
                  try {
                    await clearSession();
                    setConfirmClear(false);
                  } catch (err) {
                    notify({ tone: "error", title: "Couldn't delete candidates", description: (err as Error).message });
                  } finally {
                    setClearing(false);
                  }
                }}
                className="btn btn-reject"
              >
                {clearing && <Loader2 className="size-4 animate-spin" />} Delete
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)} className="btn btn-ghost" title="Delete all candidates">
              <Trash2 className="size-4" /> <span className="hidden sm:inline">Delete all</span>
            </button>
          )}
          <Link href="/" className="btn btn-primary">
            <Plus className="size-4" /> Screen more
          </Link>
        </div>
      </div>

      {/* Pipeline: where every candidate stands */}
      <section className="card mt-6 p-4 sm:p-5" aria-label="Pipeline">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Pipeline</h2>
          <span className="text-xs text-muted tabular-nums">{candidates.length} screened</span>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-canvas" role="img" aria-label="Share of candidates in each stage">
          {PIPELINE.map((p) => {
            const n = statusCounts[p.status] ?? 0;
            return n ? (
              <span key={p.status} className={`${p.bar} transition-[width] duration-500`} style={{ width: `${(n / candidates.length) * 100}%` }} />
            ) : null;
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PIPELINE.map((p) => {
            const n = statusCounts[p.status] ?? 0;
            const active = status === p.status;
            return (
              <button
                key={p.status}
                onClick={() => setStatus(active ? "all" : p.status)}
                aria-pressed={active}
                title={active ? "Show all candidates" : `Show only: ${p.label.toLowerCase()}`}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition active:scale-[0.98] ${
                  active ? "border-ink/30 bg-canvas" : "border-line hover:bg-canvas"
                }`}
              >
                <span className={`mt-0.5 ${p.tone}`}>
                  <p.Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-2xl leading-none font-semibold text-ink tabular-nums">{n}</span>
                  <span className={`mt-1 block text-xs font-semibold ${p.tone}`}>{p.label}</span>
                  <span className="hidden text-xs text-muted sm:block">{p.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Fit summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {TIERS.map((t, i) => {
          const m = TIER_META[t];
          return (
            <a key={t} href={`#tier-${t}`} className={`card flex flex-col border-l-4 ${m.accent} px-4 py-3 transition hover:shadow-md`}>
              <span className="text-2xl font-semibold text-ink tabular-nums">{tierTotals[i]}</span>
              <span className={`text-xs font-semibold ${m.text}`}>{m.label}</span>
              <span className="hidden text-xs text-muted sm:block">Score {m.range}</span>
            </a>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                status === f.value ? "bg-ink text-canvas" : "bg-surface text-muted ring-1 ring-line hover:text-ink"
              }`}
            >
              {f.label}
              <span className="text-xs tabular-nums opacity-70">{statusCounts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="input pl-9" />
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {grouped.map(({ tier, items }) => {
          const m = TIER_META[tier];
          return (
            <section key={tier} id={`tier-${tier}`} className="scroll-mt-20">
              <div className="mb-3 flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${m.bar}`} />
                <h2 className="font-semibold text-ink">{m.label}</h2>
                <span className="text-sm text-muted">
                  {items.length} · score {m.range}
                </span>
              </div>
              {items.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((c, i) => (
                    <CandidateCard key={c.id} candidate={c} index={i} />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                  No {m.label.toLowerCase()} candidates{status !== "all" || query ? " match these filters" : ""}.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
