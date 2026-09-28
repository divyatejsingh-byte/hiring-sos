"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface Toast {
  id: string;
  tone: "success" | "error";
  title: string;
  description?: string;
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-lg"
        >
          {t.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{t.title}</p>
            {t.description && <p className="mt-0.5 truncate text-sm text-muted">{t.description}</p>}
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
