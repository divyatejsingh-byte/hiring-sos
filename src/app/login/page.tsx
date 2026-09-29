"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, Loader2, LockKeyhole } from "lucide-react";

/** Only same-site relative paths, so ?next= can't bounce the founder to another site. */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/dashboard";
}

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Sign-in failed.");
      // Full navigation so every provider reloads with the new cookie.
      window.location.href = safeNext();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 py-12">
      <form onSubmit={submit} className="card animate-rise w-full max-w-sm p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
          <LockKeyhole className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Sign in to Hiring SOS</h1>
        <p className="mt-1 text-sm text-muted">Enter your team&apos;s access code to see your candidates.</p>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">Access code</span>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="input pl-9"
            />
          </div>
        </label>

        {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <button type="submit" disabled={busy || !code.trim()} className="btn btn-primary mt-5 w-full py-2.5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {busy ? "Checking…" : "Continue"}
        </button>
        <p className="mt-4 text-center text-xs text-muted">You&apos;ll stay signed in on this device for 30 days.</p>
      </form>
    </main>
  );
}
