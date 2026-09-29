"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Candidate, CandidateStatus, EmailKind, Role } from "@/lib/types";
import { EmailModal } from "./EmailModal";
import { Toaster, type Toast } from "./Toaster";

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
  loadError: string | null;
  reload: () => Promise<void>;
  candidates: Candidate[];
  getCandidate: (id: string) => Candidate | undefined;
  setStatus: (id: string, status: CandidateStatus) => void;
  markReviewPending: (id: string) => void;
  clearSession: () => Promise<void>;

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

  const [loadError, setLoadError] = useState<string | null>(null);

  // --- server persistence ---------------------------------------------------
  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/candidates", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { candidates?: Candidate[]; error?: string };
      if (!res.ok || !data.candidates) throw new Error(data.error || `Couldn't load candidates (${res.status})`);
      setCandidates(data.candidates);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname.startsWith("/login")) {
      setHydrated(true);
      return;
    }
    void reload();
    // Pick up changes made on another device or tab when the founder comes back.
    const onVisible = () => document.visibilityState === "visible" && void reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  // --- candidates ----------------------------------------------------------
  const getCandidate = useCallback((id: string) => candidates.find((c) => c.id === id), [candidates]);

  const setStatus = useCallback((id: string, status: CandidateStatus) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const markReviewPending = useCallback((id: string) => {
    // Never downgrade a candidate who has already been emailed.
    setCandidates((prev) => prev.map((c) => (c.id === id && c.status === "new" ? { ...c, status: "review_pending" } : c)));
    // The server applies the same "only if new" rule, so this is safe to send unconditionally.
    void fetch(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review" }),
    }).catch(() => {
      /* non-critical: the badge resyncs on the next load */
    });
  }, []);

  const clearSession = useCallback(async () => {
    const res = await fetch("/api/candidates", { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Couldn't delete candidates.");
    }
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
        const data = (await res.json().catch(() => ({}))) as { candidate?: Candidate; error?: string };
        if (!res.ok || !data.candidate) throw new Error(data.error || `Screening failed (${res.status})`);

        const candidate = data.candidate; // already saved server-side
        setCandidates((prev) => [...prev.filter((c) => c.id !== candidate.id), candidate]);
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
      loadError,
      reload,
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
    [hydrated, loadError, reload, candidates, getCandidate, setStatus, markReviewPending, clearSession, jobs, isScreening, screenBatch, retryJob, dismissJobs, openEmail, notify],
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
