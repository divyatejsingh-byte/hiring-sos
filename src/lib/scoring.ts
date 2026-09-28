import type { Decision, DimensionKey, DimensionScore, Role } from "./types";

/** Weights from rubric.txt. Kept in code so the weighted score is computed deterministically. */
export const WEIGHTS: Record<Role, Partial<Record<DimensionKey, number>>> = {
  PM: { D1: 0.25, D2: 0.25, D3: 0.2, D4: 0.15, D5: 0.15 },
  "Senior PM": { D1: 0.2, D2: 0.15, D3: 0.2, D4: 0.15, D5: 0.1, D6: 0.2 },
};

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  D1: "Ground-Truth Proximity",
  D2: "Unprompted Building",
  D3: "Unscaffolded Ownership",
  D4: "Pivot & Trade-off Evidence",
  D5: "Consequence-Anchored Outcomes",
  D6: "Integration & Platform Judgment",
};

export function dimensionsFor(role: Role): DimensionKey[] {
  return Object.keys(WEIGHTS[role]) as DimensionKey[];
}

export function computeWeightedScore(
  role: Role,
  scores: Record<DimensionKey, DimensionScore | null>,
): number {
  let total = 0;
  for (const [key, weight] of Object.entries(WEIGHTS[role]) as [DimensionKey, number][]) {
    total += (scores[key]?.score ?? 1) * weight;
  }
  return Math.round(total * 100) / 100;
}

export function decisionFor(score: number): Decision {
  if (score >= 3.8) return "ADVANCE";
  if (score >= 3.0) return "REVIEW";
  return "DECLINE";
}

export type Tier = "strong" | "borderline" | "weak";

export function tierFor(score: number): Tier {
  const d = decisionFor(score);
  return d === "ADVANCE" ? "strong" : d === "REVIEW" ? "borderline" : "weak";
}

export const TIER_META: Record<
  Tier,
  { label: string; range: string; accent: string; soft: string; text: string; ring: string; bar: string }
> = {
  strong: {
    label: "Strong fit",
    range: "3.8 +",
    accent: "border-l-emerald-500",
    soft: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "stroke-emerald-500",
    bar: "bg-emerald-500",
  },
  borderline: {
    label: "Borderline",
    range: "3.0 – 3.7",
    accent: "border-l-amber-500",
    soft: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    ring: "stroke-amber-500",
    bar: "bg-amber-500",
  },
  weak: {
    label: "Weak fit",
    range: "below 3.0",
    accent: "border-l-rose-500",
    soft: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    ring: "stroke-rose-500",
    bar: "bg-rose-500",
  },
};
