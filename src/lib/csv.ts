import { DIMENSION_LABELS, TIER_META, tierFor } from "./scoring";
import { ROLE_TITLES, type Candidate, type CandidateStatus, type DimensionKey } from "./types";

const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "Not opened yet",
  review_pending: "Under review",
  invited: "Invite sent",
  rejected: "Rejection sent",
};

const DIMS: DimensionKey[] = ["D1", "D2", "D3", "D4", "D5", "D6"];

/** Quotes a cell, and neutralises values a spreadsheet would run as a formula (CSV injection). */
function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function candidatesToCsv(candidates: Candidate[]): string {
  const header = [
    "Name",
    "Email",
    "Phone",
    "Role",
    "Years of experience",
    "Location",
    "Weighted score",
    "Fit",
    "Recommendation",
    "Status",
    "Location gate",
    ...DIMS.map((d) => `${d} ${DIMENSION_LABELS[d]}`),
    "Summary",
    "Strengths",
    "Gaps",
    "Red flags",
    "Soft flags",
    "Resume file",
    "Screened at",
  ];

  const rows = candidates.map((c) => {
    const r = c.result;
    return [
      r.contact.name,
      r.contact.email,
      r.contact.phone,
      ROLE_TITLES[c.role],
      r.contact.years_experience,
      r.contact.location,
      r.weighted_score.toFixed(2),
      TIER_META[tierFor(r.weighted_score)].label,
      r.decision,
      STATUS_LABELS[c.status],
      r.gate_status,
      ...DIMS.map((d) => r.scores[d]?.score ?? ""),
      r.summary,
      r.strengths.join("\n"),
      r.gaps.join("\n"),
      r.red_flags.join("\n"),
      r.soft_flags.join("\n"),
      c.fileName,
      new Date(c.screenedAt).toISOString(),
    ];
  });

  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // BOM so Excel opens UTF-8 names (e.g. accented characters) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
