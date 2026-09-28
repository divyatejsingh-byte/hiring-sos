"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Candidate, CandidateStatus, EmailKind, Role, ScreeningResult } from "@/lib/types";
import { EmailModal } from "./EmailModal";
import { Toaster, type Toast } from "./Toaster";

const STORAGE_KEY = "hiring-sos:candidates:v1";
const CONCURRENCY = 3;

export type JobState = "queued" | "processing" | "done" | "error";
export interface ScreeningJob {
  id: string;
  fileName: string;
  size: number;
  state: JobState;
  error?: string;
  candidateId?: string;
}

interface HiringContextValue {
  hydrated: boolean;
  candidates: Candidate[];
  getCandidate: (id: string) => Candidate | undefined;
  setStatus: (id: string, status: CandidateStatus) => void;
  markReviewPending: (id: string) => void;
  clearSession: () => void;

  jobs: ScreeningJob[];
  isScreening: boolean;
  screenBatch: (files: File[], role: Role) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  dismissJobs: () => void;

  openEmail: (candidateId: string, kind: EmailKind) => void;
  notify: (toast: Omit<Toast, "id">) => void;
}

const HiringContext = createContext<HiringContextValue | null>(null);

export function useHiring() {
  const ctx = useContext(HiringContext);
  if (!ctx) throw new Error("useHiring must be used within HiringProvider");
  return ctx;
}

const uid = () => crypto.randomUUID();

export function HiringProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [jobs, setJobs] = useState<ScreeningJob[]>([]);
  const [email, setEmail] = useState<{ candidateId: string; kind: EmailKind } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Files can't be serialised, so retries read them from memory.
  const pendingFiles = useRef(new Map<string, { file: File; role: Role }>());

  // --- session persistence -------------------------------------------------
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setCandidates(JSON.parse(raw));
    } catch {
      /* storage unavailable or corrupt: start fresh */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    } catch {
      /* quota or private mode: state still lives in memory */
    }
  }, [candidates, hydrated]);

  // --- candidates ----------------------------------------------------------
  const getCandidate = useCallback((id: string) => candidates.find((c) => c.id === id), [candidates]);

  const setStatus = useCallback((id: string, status: CandidateStatus) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const markReviewPending = useCallback((id: string) => {
    // Never downgrade a candidate who has already been emailed.
    setCandidates((prev) => prev.map((c) => (c.id === id && c.status === "new" ? { ...c, status: "review_pending" } : c)));
  }, []);

  const clearSession = useCallback(() => {
    setCandidates([]);
    setJobs([]);
    pendingFiles.current.clear();
  }, []);

  // --- toasts --------------------------------------------------------------
  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = uid();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  // --- screening queue -----------------------------------------------------
  const patchJob = useCallback((id: string, patch: Partial<ScreeningJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const runJob = useCallback(
    async (jobId: string) => {
      const entry = pendingFiles.current.get(jobId);
      if (!entry) return;
      patchJob(jobId, { state: "processing", error: undefined });

      const form = new FormData();
      form.append("file", entry.file);
      form.append("role", entry.role);

      try {
        const res = await fetch("/api/screen", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { result?: ScreeningResult; error?: string };
        if (!res.ok || !data.result) throw new Error(data.error || `Screening failed (${res.status})`);

        const candidate: Candidate = {
          id: uid(),
          fileName: entry.file.name,
          role: entry.role,
          screenedAt: new Date().toISOString(),
          status: "new",
          result: data.result,
        };
        setCandidates((prev) => [...prev, candidate]);
        pendingFiles.current.delete(jobId);
        patchJob(jobId, { state: "done", candidateId: candidate.id });
      } catch (err) {
        patchJob(jobId, { state: "error", error: (err as Error).message || "Network error" });
      }
    },
    [patchJob],
  );

  const screenBatch = useCallback(
    async (files: File[], role: Role) => {
      const newJobs: ScreeningJob[] = files.map((file) => {
        const id = uid();
        pendingFiles.current.set(id, { file, role });
        return { id, fileName: file.name, size: file.size, state: "queued" };
      });
      setJobs(newJobs);

      // Small worker pool: keeps Gemini under rate limits while still feeling instant.
      const queue = newJobs.map((j) => j.id);
      const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) await runJob(next);
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    },
    [runJob],
  );

  const retryJob = useCallback((jobId: string) => runJob(jobId), [runJob]);
  const dismissJobs = useCallback(() => setJobs([]), []);
  const isScreening = jobs.some((j) => j.state === "queued" || j.state === "processing");

  // --- email modal ---------------------------------------------------------
  const openEmail = useCallback((candidateId: string, kind: EmailKind) => setEmail({ candidateId, kind }), []);
  const emailCandidate = email ? candidates.find((c) => c.id === email.candidateId) : undefined;

  const value = useMemo<HiringContextValue>(
    () => ({
      hydrated,
      candidates,
      getCandidate,
      setStatus,
      markReviewPending,
      clearSession,
      jobs,
      isScreening,
      screenBatch,
      retryJob,
      dismissJobs,
      openEmail,
      notify,
    }),
    [hydrated, candidates, getCandidate, setStatus, markReviewPending, clearSession, jobs, isScreening, screenBatch, retryJob, dismissJobs, openEmail, notify],
  );

  return (
    <HiringContext.Provider value={value}>
      {children}
      {email && emailCandidate && (
        <EmailModal
          key={`${email.candidateId}-${email.kind}`}
          candidate={emailCandidate}
          kind={email.kind}
          onClose={() => setEmail(null)}
          onSent={() => {
            setStatus(emailCandidate.id, email.kind === "invite" ? "invited" : "rejected");
            notify({
              tone: "success",
              title: email.kind === "invite" ? "Interview invite sent" : "Rejection email sent",
              description: `${emailCandidate.result.contact.name} · ${emailCandidate.result.contact.email}`,
            });
            setEmail(null);
          }}
        />
      )}
      <Toaster toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </HiringContext.Provider>
  );
}
