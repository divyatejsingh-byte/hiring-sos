import { CheckCircle2, Clock, Eye, Sparkles, XCircle } from "lucide-react";
import { TIER_META, tierFor } from "@/lib/scoring";
import type { CandidateStatus } from "@/lib/types";

const STATUS_META: Record<CandidateStatus, { label: string; className: string; Icon: typeof Clock }> = {
  new: { label: "New", className: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900", Icon: Sparkles },
  review_pending: {
    label: "Review Pending",
    className: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
    Icon: Eye,
  },
  invited: {
    label: "Invited",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    Icon: XCircle,
  },
};

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const { label, className, Icon } = STATUS_META[status];
  return (
    <span
      key={status}
      className={`animate-pop inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${className}`}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

/** Circular score out of 5, coloured by tier. */
export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const meta = TIER_META[tierFor(score)];
  const stroke = size >= 72 ? 6 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 5));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Score ${score.toFixed(2)} out of 5`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={`${meta.ring} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={`font-semibold tabular-nums ${size >= 72 ? "text-xl" : "text-sm"} text-ink`}>{score.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function TierPill({ score }: { score: number }) {
  const meta = TIER_META[tierFor(score)];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.soft} ${meta.text}`}>{meta.label}</span>;
}
