export type Role = "PM" | "Senior PM";

export const ROLE_TITLES: Record<Role, string> = {
  PM: "Product Manager",
  "Senior PM": "Senior Product Manager",
};

export type DimensionKey = "D1" | "D2" | "D3" | "D4" | "D5" | "D6";

export interface DimensionScore {
  score: number;
  evidence: string;
}

export type Decision = "ADVANCE" | "REVIEW" | "DECLINE";
export type GateStatus = "pass" | "fail" | "location unknown";

export interface ContactDetails {
  name: string;
  email: string | null;
  phone: string | null;
  years_experience: number | null;
  location: string | null;
}

export interface InterviewProbes {
  lowest_dimension: { dimension: DimensionKey; probe: string };
  ownership_tradeoffs: { probe: string };
  domain_reality: { probe: string };
}

/** Normalised output of one Gemini screening pass. */
export interface ScreeningResult {
  candidate: string;
  role: Role;
  contact: ContactDetails;
  scores: Record<DimensionKey, DimensionScore | null>;
  weighted_score: number;
  decision: Decision;
  gate_status: GateStatus;
  soft_flags: string[];
  red_flags: string[];
  summary: string;
  strengths: string[];
  gaps: string[];
  interview_probes: InterviewProbes;
}

export type CandidateStatus = "new" | "review_pending" | "invited" | "rejected";

export interface Candidate {
  id: string;
  fileName: string;
  role: Role;
  screenedAt: string;
  status: CandidateStatus;
  result: ScreeningResult;
}

export type EmailKind = "invite" | "rejection";
