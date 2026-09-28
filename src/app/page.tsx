"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Crown,
  FileText,
  Loader2,
  RotateCw,
  ScanSearch,
  UploadCloud,
  X,
} from "lucide-react";
import { useHiring, type ScreeningJob } from "@/components/HiringProvider";
import { ROLE_TITLES, type Role } from "@/lib/types";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 10 * 1024 * 1024;

const ROLES: { value: Role; blurb: string; Icon: typeof Briefcase }[] = [
  { value: "PM", blurb: "Five dimensions: ops proximity, building, ownership, trade-offs, outcomes", Icon: Briefcase },
  { value: "Senior PM", blurb: "Adds integration & platform judgment (carrier, ERP, EDI, customs)", Icon: Crown },
];

export default function ScreenPage() {
  const router = useRouter();
  const { screenBatch, jobs, isScreening, retryJob, dismissJobs } = useHiring();
  const [role, setRole] = useState<Role>("PM");
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const done = jobs.filter((j) => j.state === "done").length;
  const failed = jobs.filter((j) => j.state === "error").length;
  const finished = jobs.length > 0 && !isScreening;

  // Glide into the dashboard once a clean batch completes.
  useEffect(() => {
    if (finished && failed === 0 && done > 0) {
      const t = setTimeout(() => {
        router.push("/dashboard");
        dismissJobs();
      }, 900);
      return () => clearTimeout(t);
    }
  }, [finished, failed, done, router, dismissJobs]);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const bad: string[] = [];
    const good = incoming.filter((f) => {
      const ok = /\.(pdf|docx)$/i.test(f.name) && f.size > 0 && f.size <= MAX_BYTES;
      if (!ok) bad.push(f.name);
      return ok;
    });
    setRejected(bad);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...good.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  async function start() {
    if (!files.length) return;
    const batch = files;
    setFiles([]);
    await screenBatch(batch, role);
  }

  if (jobs.length > 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <ProcessingPanel
          jobs={jobs}
          done={done}
          failed={failed}
          finished={finished}
          onRetry={retryJob}
          onContinue={() => {
            router.push("/dashboard");
            dismissJobs();
          }}
          onStartOver={dismissJobs}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="animate-rise text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
          <ScanSearch className="size-3.5 text-brand" /> Rubric-calibrated screening
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
          Clear your resume pile in minutes.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-pretty text-muted">
          Pick the role, drop in every resume at once. Each one is scored against your rubric with quoted evidence, then
          ranked so you can invite or decline in a click.
        </p>
      </div>

      <section className="animate-rise mt-10 [animation-delay:60ms]">
        <h2 className="mb-3 text-sm font-semibold text-ink">1. Target role</h2>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
          {ROLES.map(({ value, blurb, Icon }) => {
            const active = role === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={active}
                onClick={() => setRole(value)}
                className={`card flex items-start gap-3 p-4 text-left transition-all duration-150 active:scale-[0.99] ${
                  active ? "border-brand ring-4 ring-brand/15" : "hover:border-muted/40"
                }`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-brand text-brand-ink" : "bg-canvas text-muted"}`}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{ROLE_TITLES[value]}</span>
                  <span className="mt-0.5 block text-sm text-muted">{blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="animate-rise mt-8 [animation-delay:120ms]">
        <h2 className="mb-3 text-sm font-semibold text-ink">2. Resumes</h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
            dragging ? "scale-[1.01] border-brand bg-brand/5" : "border-line bg-surface hover:border-muted/50"
          }`}
        >
          <span className={`grid size-12 place-items-center rounded-2xl transition ${dragging ? "bg-brand text-brand-ink" : "bg-canvas text-muted"}`}>
            <UploadCloud className="size-6" />
          </span>
          <p className="mt-3 font-medium text-ink">
            Drop resumes here or <span className="text-brand">browse</span>
          </p>
          <p className="mt-1 text-sm text-muted">PDF or DOCX · up to 10 MB each · as many as you like</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {rejected.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-rose-600 dark:text-rose-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            Skipped {rejected.length} file{rejected.length > 1 ? "s" : ""} (not PDF/DOCX, empty or over 10 MB): {rejected.join(", ")}
          </p>
        )}

        {files.length > 0 && (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="animate-rise flex items-center gap-3 px-4 py-2.5">
                <FileIcon name={f.name} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.name}</span>
                <span className="text-xs text-muted tabular-nums">{formatSize(f.size)}</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded p-1 text-muted hover:bg-canvas hover:text-ink"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="animate-rise mt-8 flex flex-col items-center gap-2 [animation-delay:180ms]">
        <button onClick={start} disabled={!files.length} className="btn btn-primary w-full px-6 py-3 text-base sm:w-auto">
          <ScanSearch className="size-5" />
          Screen {files.length ? `${files.length} ` : ""}Candidate{files.length === 1 ? "" : "s"}
        </button>
        <p className="text-xs text-muted">Resumes are sent to Gemini for scoring and aren&apos;t stored on the server.</p>
      </div>
    </main>
  );
}

function ProcessingPanel({
  jobs,
  done,
  failed,
  finished,
  onRetry,
  onContinue,
  onStartOver,
}: {
  jobs: ScreeningJob[];
  done: number;
  failed: number;
  finished: boolean;
  onRetry: (id: string) => void;
  onContinue: () => void;
  onStartOver: () => void;
}) {
  const pct = Math.round(((done + failed) / jobs.length) * 100);
  return (
    <div className="card animate-rise overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          {finished ? (
            failed ? <AlertCircle className="size-6 text-amber-500" /> : <CheckCircle2 className="size-6 text-emerald-500" />
          ) : (
            <Loader2 className="size-6 animate-spin text-brand" />
          )}
          <div className="flex-1">
            <h1 className="font-semibold text-ink">
              {finished ? (failed ? "Screening finished with issues" : "All candidates screened") : "Screening candidates…"}
            </h1>
            <p className="text-sm text-muted">
              {done} of {jobs.length} scored{failed ? ` · ${failed} failed` : ""}
              {finished && !failed ? " · opening dashboard" : ""}
            </p>
          </div>
          <span className="text-sm font-semibold text-ink tabular-nums">{pct}%</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto border-t border-line">
        {jobs.map((j) => (
          <li key={j.id} className="flex items-center gap-3 px-5 py-3">
            <FileIcon name={j.fileName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{j.fileName}</p>
              {j.error && <p className="text-xs text-rose-600 dark:text-rose-400">{j.error}</p>}
            </div>
            {j.state === "queued" && <span className="text-xs text-muted">Queued</span>}
            {j.state === "processing" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand">
                <Loader2 className="size-3.5 animate-spin" /> Scoring
              </span>
            )}
            {j.state === "done" && <CheckCircle2 className="animate-pop size-5 text-emerald-500" />}
            {j.state === "error" && (
              <button onClick={() => onRetry(j.id)} className="btn btn-outline px-2.5 py-1 text-xs">
                <RotateCw className="size-3.5" /> Retry
              </button>
            )}
          </li>
        ))}
      </ul>

      {finished && failed > 0 && (
        <div className="flex flex-col gap-2 border-t border-line bg-canvas/60 px-5 py-3 sm:flex-row sm:justify-end">
          <button onClick={onStartOver} className="btn btn-ghost">
            Screen more
          </button>
          {done > 0 && (
            <button onClick={onContinue} className="btn btn-primary">
              View {done} candidate{done > 1 ? "s" : ""} <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FileIcon({ name }: { name: string }) {
  const pdf = /\.pdf$/i.test(name);
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${
        pdf ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400" : "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400"
      }`}
    >
      <FileText className="size-4" />
    </span>
  );
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
