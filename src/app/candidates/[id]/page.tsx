"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Flag,
  HelpCircle,
  Mail,
  MailX,
  MapPin,
  MessageSquareQuote,
  Phone,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  ThumbsDown,
  ThumbsUp,
  UserX,
} from "lucide-react";
import { BulletText } from "@/components/CandidateCard";
import { useHiring } from "@/components/HiringProvider";
import { ScoreRing, StatusBadge, TierPill } from "@/components/ui";
import { DIMENSION_LABELS, TIER_META, WEIGHTS, dimensionsFor, tierFor } from "@/lib/scoring";
import { ROLE_TITLES, type Candidate, type DimensionKey } from "@/lib/types";

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hydrated, getCandidate, markReviewPending, openEmail } = useHiring();
  const candidate = getCandidate(id);

  // Deep links and refreshes should also flag the candidate as under review.
  useEffect(() => {
    if (candidate) markReviewPending(candidate.id);
  }, [candidate?.id, markReviewPending]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) return null;
  if (!candidate) {
    return (
      <main className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
        <UserX className="size-10 text-muted" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Candidate not found</h1>
        <p className="mt-1 text-sm text-muted">They may have been cleared from this session.</p>
        <Link href="/dashboard" className="btn btn-outline mt-6">
          <ArrowLeft className="size-4" /> Back to candidates
        </Link>
      </main>
    );
  }

  const { result, status } = candidate;

  return (
    <>
      {/* Pinned action bar */}
      <div className="sticky top-14 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="btn btn-ghost -ml-2 px-2" aria-label="Back to candidates">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ScoreRing score={result.weighted_score} size={44} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate font-semibold text-ink">{result.contact.name}</h1>
                <StatusBadge status={status} />
              </div>
              <p className="truncate text-xs text-muted">{ROLE_TITLES[candidate.role]}</p>
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              onClick={() => openEmail(candidate.id, "invite")}
              disabled={status === "invited"}
              className="btn btn-invite flex-1 sm:flex-none"
            >
              {status === "invited" ? <CheckCircle2 className="size-4" /> : <CalendarCheck className="size-4" />}
              {status === "invited" ? "Invite sent" : "Send Interview Invite"}
            </button>
            <button
              onClick={() => openEmail(candidate.id, "rejection")}
              disabled={status === "rejected"}
              className="btn btn-reject flex-1 sm:flex-none"
            >
              {status === "rejected" ? <CheckCircle2 className="size-4" /> : <MailX className="size-4" />}
              {status === "rejected" ? "Rejection sent" : "Send Rejection Email"}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {result.summary && (
            <p className="animate-rise text-lg leading-relaxed text-pretty text-ink">{result.summary}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <BulletPanel
              title="Core strengths"
              Icon={ThumbsUp}
              tone="text-emerald-600 dark:text-emerald-400"
              items={result.strengths}
              empty="No clear strengths identified."
            />
            <BulletPanel
              title="Key gaps & missing signals"
              Icon={ThumbsDown}
              tone="text-rose-600 dark:text-rose-400"
              items={result.gaps}
              empty="No major gaps flagged."
            />
          </div>

          <DimensionBreakdown candidate={candidate} />
          <Probes candidate={candidate} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <Profile candidate={candidate} />
          <Flags candidate={candidate} />
        </aside>
      </main>
    </>
  );
}

function BulletPanel({
  title,
  Icon,
  tone,
  items,
  empty,
}: {
  title: string;
  Icon: typeof ThumbsUp;
  tone: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="card animate-rise p-5">
      <h2 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${tone}`}>
        <Icon className="size-4" /> {title}
      </h2>
      <ul className="space-y-2.5">
        {(items.length ? items : [empty]).map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/85">
            <span className={`mt-2 size-1.5 shrink-0 rounded-full bg-current ${tone}`} />
            <span>
              <BulletText text={item} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DimensionBreakdown({ candidate }: { candidate: Candidate }) {
  const dims = dimensionsFor(candidate.role);
  const weights = WEIGHTS[candidate.role];
  return (
    <section className="card animate-rise overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">Dimension scores</h2>
        <TierPill score={candidate.result.weighted_score} />
      </header>
      <ul className="divide-y divide-line">
        {dims.map((key) => {
          const d = candidate.result.scores[key];
          const score = d?.score ?? 1;
          const tone = score >= 4 ? TIER_META.strong : score === 3 ? TIER_META.borderline : TIER_META.weak;
          return (
            <li key={key} className="px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="w-7 font-mono text-xs font-semibold text-muted">{key}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink">{DIMENSION_LABELS[key]}</p>
                    <p className="shrink-0 text-xs text-muted tabular-nums">
                      <span className="text-sm font-semibold text-ink">{score}</span>/5 · {Math.round((weights[key] ?? 0) * 100)}%
                    </p>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${n <= score ? tone.bar : "bg-line"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <blockquote className="mt-3 ml-10 flex gap-2 rounded-lg bg-canvas px-3 py-2 text-sm leading-relaxed text-ink/80">
                <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-muted" />
                <span className="whitespace-pre-line">{d?.evidence || "No evidence found in CV."}</span>
              </blockquote>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Probes({ candidate }: { candidate: Candidate }) {
  const p = candidate.result.interview_probes;
  const lowest = p.lowest_dimension.dimension as DimensionKey;
  const items = [
    { label: `Weakest area · ${lowest} ${DIMENSION_LABELS[lowest] ?? ""}`, probe: p.lowest_dimension.probe },
    { label: "Ownership & trade-offs", probe: p.ownership_tradeoffs.probe },
    { label: "Domain reality check", probe: p.domain_reality.probe },
  ];
  return (
    <section className="card animate-rise p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <HelpCircle className="size-4 text-brand" /> Interview probes
      </h2>
      <ol className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{i + 1}</span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{item.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">{item.probe}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Profile({ candidate }: { candidate: Candidate }) {
  const c = candidate.result.contact;
  const rows = [
    { Icon: Mail, value: c.email ?? "No email on resume", href: c.email ? `mailto:${c.email}` : undefined },
    { Icon: Phone, value: c.phone ?? "—", href: c.phone ? `tel:${c.phone.replace(/[^\d+]/g, "")}` : undefined },
    { Icon: Briefcase, value: c.years_experience != null ? `${c.years_experience} years experience` : "Experience not stated" },
    { Icon: MapPin, value: c.location ?? "Location not stated" },
    { Icon: FileText, value: candidate.fileName },
    { Icon: Clock, value: `Screened ${new Date(candidate.screenedAt).toLocaleString()}` },
  ];
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">Profile</h2>
      <ul className="space-y-2.5">
        {rows.map(({ Icon, value, href }, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
            {href ? (
              <a href={href} className="min-w-0 break-all text-ink hover:text-brand">
                {value}
              </a>
            ) : (
              <span className="min-w-0 break-words text-ink/85">{value}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Flags({ candidate }: { candidate: Candidate }) {
  const { gate_status, soft_flags, red_flags, weighted_score } = candidate.result;
  const gate = {
    pass: { Icon: ShieldCheck, label: "Location gate passed", className: "text-emerald-600 dark:text-emerald-400" },
    fail: { Icon: ShieldX, label: "Location gate failed", className: "text-rose-600 dark:text-rose-400" },
    "location unknown": { Icon: ShieldQuestion, label: "Location unknown: confirm Mumbai / relocation", className: "text-amber-600 dark:text-amber-400" },
  }[gate_status];
  const tier = TIER_META[tierFor(weighted_score)];

  return (
    <section className="card space-y-4 p-5">
      <div className={`rounded-lg px-3 py-2 text-sm font-medium ${tier.soft} ${tier.text}`}>
        Recommendation: {candidate.result.decision}
      </div>
      <p className={`flex items-start gap-2 text-sm font-medium ${gate.className}`}>
        <gate.Icon className="mt-0.5 size-4 shrink-0" /> {gate.label}
      </p>
      <FlagList title="Red flags" Icon={AlertTriangle} items={red_flags} className="text-rose-600 dark:text-rose-400" />
      <FlagList title="Soft flags" Icon={Flag} items={soft_flags} className="text-amber-600 dark:text-amber-400" />
    </section>
  );
}

function FlagList({ title, Icon, items, className }: { title: string; Icon: typeof Flag; items: string[]; className: string }) {
  return (
    <div>
      <p className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${className}`}>
        <Icon className="size-3.5" /> {title}
      </p>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((f, i) => (
            <li key={i} className="text-sm leading-relaxed text-ink/80">
              {f}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">None</p>
      )}
    </div>
  );
}
