"use client";

import { useRouter } from "next/navigation";
import { Briefcase, CalendarCheck, Check, Eye, Mail, MailX, MapPin, Phone, ThumbsDown, ThumbsUp } from "lucide-react";
import { TIER_META, tierFor } from "@/lib/scoring";
import type { Candidate } from "@/lib/types";
import { useHiring } from "./HiringProvider";
import { ScoreRing, StatusBadge } from "./ui";

export function CandidateCard({ candidate, index = 0 }: { candidate: Candidate; index?: number }) {
  const router = useRouter();
  const { markReviewPending, openEmail } = useHiring();
  const { result, status } = candidate;
  const tier = tierFor(result.weighted_score);
  const meta = TIER_META[tier];

  const review = () => {
    markReviewPending(candidate.id);
    router.push(`/candidates/${candidate.id}`);
  };

  const inviteBtn = (compact = false) =>
    status === "invited" ? (
      <SentChip label="Invite sent" />
    ) : (
      <button onClick={() => openEmail(candidate.id, "invite")} className={`btn ${compact ? "btn-outline" : "btn-invite"} flex-1`}>
        <CalendarCheck className="size-4" /> {compact ? "Invite" : "Send Interview Invite"}
      </button>
    );

  const rejectBtn = (compact = false) =>
    status === "rejected" ? (
      <SentChip label="Rejection sent" />
    ) : (
      <button onClick={() => openEmail(candidate.id, "rejection")} className={`btn ${compact ? "btn-outline" : "btn-reject"} flex-1`}>
        <MailX className="size-4" /> {compact ? "Reject" : "Send Rejection Email"}
      </button>
    );

  const reviewBtn = (primary = false) => (
    <button onClick={review} className={`btn ${primary ? "btn-primary" : "btn-outline"} ${primary ? "flex-1" : ""}`}>
      <Eye className="size-4" /> Review
    </button>
  );

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={`card animate-rise flex flex-col border-l-4 ${meta.accent} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        status === "rejected" ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-ink">{result.contact.name}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Briefcase className="size-3.5" />
              {candidate.role}
              {result.contact.years_experience != null && ` · ${result.contact.years_experience} yrs`}
            </span>
            {result.contact.location && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{result.contact.location}</span>
              </span>
            )}
          </p>
          <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-muted">
            <span className="inline-flex min-w-0 items-center gap-1">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{result.contact.email ?? "No email on resume"}</span>
            </span>
            {result.contact.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" /> {result.contact.phone}
              </span>
            )}
          </div>
        </div>
        <ScoreRing score={result.weighted_score} />
      </div>

      {result.summary && <p className="px-4 text-sm text-pretty text-ink/85">{result.summary}</p>}

      <div className="mt-3 grid flex-1 gap-3 px-4 pb-4">
        <Snapshot tone="up" title="Why they scored high" items={result.strengths} fallback="No clear strengths identified." />
        <Snapshot tone="down" title="Where they fell short" items={result.gaps} fallback="No major gaps flagged." />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line p-3">
        {tier === "strong" && (
          <>
            {inviteBtn()}
            {reviewBtn()}
          </>
        )}
        {tier === "weak" && (
          <>
            {rejectBtn()}
            {reviewBtn()}
          </>
        )}
        {tier === "borderline" && (
          <>
            {reviewBtn(true)}
            {inviteBtn(true)}
            {rejectBtn(true)}
          </>
        )}
      </div>
    </article>
  );
}

function Snapshot({ tone, title, items, fallback }: { tone: "up" | "down"; title: string; items: string[]; fallback: string }) {
  const Icon = tone === "up" ? ThumbsUp : ThumbsDown;
  const color = tone === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  return (
    <div>
      <p className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${color}`}>
        <Icon className="size-3.5" /> {title}
      </p>
      <ul className="space-y-1">
        {(items.length ? items.slice(0, 2) : [fallback]).map((item, i) => (
          <li key={i} className="line-clamp-2 text-sm text-muted">
            <BulletText text={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Renders a leading "D3:" dimension tag as a chip. */
export function BulletText({ text }: { text: string }) {
  const m = text.match(/^\s*\(?(D[1-6])\)?\s*[:\-–—]\s*(.*)$/s);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="mr-1 rounded bg-canvas px-1 py-px font-mono text-[11px] font-semibold text-ink/70 ring-1 ring-line">{m[1]}</span>
      {m[2]}
    </>
  );
}

function SentChip({ label }: { label: string }) {
  return (
    <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-sm font-medium text-muted">
      <Check className="size-4" /> {label}
    </span>
  );
}
