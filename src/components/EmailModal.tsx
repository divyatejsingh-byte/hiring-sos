"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarCheck, FileText, Loader2, MailX, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { buildEmail } from "@/lib/email-templates";
import { ROLE_TITLES, type Candidate, type EmailKind } from "@/lib/types";

interface Props {
  candidate: Candidate;
  kind: EmailKind;
  onClose: () => void;
  onSent: () => void;
}

type DraftState = "drafting" | "ai" | "template" | "failed";
type Email = { subject: string; body: string };

export function EmailModal({ candidate, kind, onClose, onSent }: Props) {
  const [template] = useState<Email>(() => buildEmail(kind, candidate));
  const [to, setTo] = useState(candidate.result.contact.email ?? "");
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  // What "Reset" returns to: the latest AI draft, or the basic template.
  const [baseline, setBaseline] = useState<Email>(template);
  const [draftState, setDraftState] = useState<DraftState>("drafting");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const draftAbort = useRef<AbortController | null>(null);
  const candidateRef = useRef(candidate);
  candidateRef.current = candidate;

  const isInvite = kind === "invite";
  const drafting = draftState === "drafting";
  const edited = subject !== baseline.subject || body !== baseline.body;

  const applyEmail = (email: Email) => {
    setBaseline(email);
    setSubject(email.subject);
    setBody(email.body);
  };

  const requestDraft = useCallback(async () => {
    draftAbort.current?.abort();
    const controller = new AbortController();
    draftAbort.current = controller;
    setDraftState("drafting");
    const { result: r, role } = candidateRef.current;
    try {
      const res = await fetch("/api/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          kind,
          role,
          name: r.contact.name,
          summary: r.summary,
          strengths: r.strengths,
          gaps: r.gaps,
          scores: r.scores,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Email> & { error?: string };
      if (!res.ok || !data.subject || !data.body) throw new Error(data.error || "Draft failed");
      applyEmail({ subject: data.subject, body: data.body });
      setDraftState("ai");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setDraftState("failed");
    }
  }, [kind]);

  const useTemplate = () => {
    draftAbort.current?.abort();
    applyEmail(template);
    setDraftState("template");
  };

  useEffect(() => {
    void requestDraft();
    return () => draftAbort.current?.abort();
  }, [requestDraft]);
  const alreadyActioned = candidate.status === "invited" || candidate.status === "rejected";
  const validTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim());

  // Latest handlers for the one-time keyboard listener below.
  const keyHandlers = useRef({ send: () => {}, close: onClose, sending });
  keyHandlers.current = { send: () => void send(), close: onClose, sending };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = keyHandlers.current;
      if (e.key === "Escape" && !h.sending) h.close();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) h.send();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  async function send() {
    if (sending || drafting || !validTo) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject, body, kind, candidateId: candidate.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `Send failed (${res.status})`);
      onSent();
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="animate-fade-in absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => !sending && onClose()} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-title"
        className="animate-modal-in relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${
              isInvite ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
            }`}
          >
            {isInvite ? <CalendarCheck className="size-5" /> : <MailX className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="email-title" className="text-base font-semibold text-ink">
              {isInvite ? "Send interview invite" : "Send rejection email"}
            </h2>
            <p className="truncate text-sm text-muted">
              {candidate.result.contact.name} · {ROLE_TITLES[candidate.role]}
            </p>
          </div>
          <button onClick={onClose} disabled={sending} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {alreadyActioned && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              This candidate was already marked <strong className="font-semibold">{candidate.status}</strong>. Sending will update their status.
            </div>
          )}

          <Field label="To">
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="candidate@email.com"
              className={`input ${to && !validTo ? "border-rose-400 focus:ring-rose-400/30" : ""}`}
            />
            {!candidate.result.contact.email && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No email found on the resume. Add one to send.</p>
            )}
          </Field>

          <Field label="Subject">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} readOnly={drafting} className={`input ${drafting ? "opacity-40" : ""}`} />
          </Field>

          <Field
            label="Message"
            action={
              edited &&
              !drafting && (
                <button
                  type="button"
                  onClick={() => applyEmail(baseline)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted normal-case hover:text-ink"
                >
                  <RotateCcw className="size-3" /> Undo my edits
                </button>
              )
            }
          >
            <div className="relative">
              <textarea
                data-autofocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                readOnly={drafting}
                rows={15}
                className={`input resize-y font-[inherit] leading-relaxed transition-opacity ${drafting ? "opacity-10" : ""}`}
              />
              {drafting && (
                <div className="animate-fade-in absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg">
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm">
                    <Sparkles className="size-4 animate-pulse text-brand" />
                    {isInvite ? "Personalising the invite…" : "Writing a kind rejection with short feedback…"}
                  </span>
                  <button type="button" onClick={useTemplate} className="text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
                    Skip and use the basic template
                  </button>
                </div>
              )}
            </div>
          </Field>

          {!drafting && (
            <div className="-mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={`inline-flex items-center gap-1.5 ${draftState === "failed" ? "text-amber-600 dark:text-amber-400" : "text-muted"}`}>
                {draftState === "ai" && (
                  <>
                    <Sparkles className="size-3.5 text-brand" />
                    {isInvite ? "Personalised from their screening" : "Personalised, with short feedback from their screening"}. Review before sending.
                  </>
                )}
                {draftState === "template" && (
                  <>
                    <FileText className="size-3.5" /> Basic template
                  </>
                )}
                {draftState === "failed" && (
                  <>
                    <AlertTriangle className="size-3.5" /> Couldn&apos;t personalise this one, so the basic template is shown.
                  </>
                )}
              </span>
              <span className="flex gap-1">
                <button type="button" onClick={() => void requestDraft()} className="btn btn-ghost px-2 py-1 text-xs">
                  <Sparkles className="size-3.5" /> {draftState === "ai" ? "Regenerate" : "Personalise"}
                </button>
                {draftState === "ai" && (
                  <button type="button" onClick={useTemplate} className="btn btn-ghost px-2 py-1 text-xs">
                    <FileText className="size-3.5" /> Basic template
                  </button>
                )}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line bg-canvas/60 px-5 py-3">
          <p className="hidden text-xs text-muted sm:block">
            <kbd className="rounded border border-line bg-surface px-1">Ctrl</kbd> +{" "}
            <kbd className="rounded border border-line bg-surface px-1">Enter</kbd> to send
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button onClick={onClose} disabled={sending} className="btn btn-ghost flex-1 sm:flex-none">
              Cancel
            </button>
            <button
              onClick={send}
              disabled={sending || drafting || !validTo}
              className={`btn flex-1 sm:flex-none ${isInvite ? "btn-invite" : "btn-reject"}`}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? "Sending…" : isInvite ? "Send invite" : "Send rejection"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
        {action}
      </span>
      {children}
    </label>
  );
}
