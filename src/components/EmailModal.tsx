"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarCheck, Loader2, MailX, RotateCcw, Send, X } from "lucide-react";
import { buildEmail } from "@/lib/email-templates";
import { ROLE_TITLES, type Candidate, type EmailKind } from "@/lib/types";

interface Props {
  candidate: Candidate;
  kind: EmailKind;
  onClose: () => void;
  onSent: () => void;
}

export function EmailModal({ candidate, kind, onClose, onSent }: Props) {
  const template = buildEmail(kind, candidate);
  const [to, setTo] = useState(candidate.result.contact.email ?? "");
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isInvite = kind === "invite";
  const edited = subject !== template.subject || body !== template.body;
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
    if (sending || !validTo) return;
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
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" />
          </Field>

          <Field
            label="Message"
            action={
              edited && (
                <button
                  onClick={() => {
                    setSubject(template.subject);
                    setBody(template.body);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
                >
                  <RotateCcw className="size-3" /> Reset template
                </button>
              )
            }
          >
            <textarea
              data-autofocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="input resize-y font-[inherit] leading-relaxed"
            />
          </Field>

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
              disabled={sending || !validTo}
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
