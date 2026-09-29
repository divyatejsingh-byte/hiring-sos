import type { Metadata } from "next";
import { Flag, HelpCircle, ListChecks, MapPin, Scale, ShieldAlert, Target } from "lucide-react";
import { loadRubric, type RubricDimension } from "@/lib/rubric";
import { DIMENSION_LABELS, TIER_META, WEIGHTS, type Tier } from "@/lib/scoring";
import { ROLE_TITLES, type Role } from "@/lib/types";

export const metadata: Metadata = { title: "Rubric · Hiring SOS" };

const ROLES: Role[] = ["PM", "Senior PM"];
const TIERS: { tier: Tier; decision: string }[] = [
  { tier: "strong", decision: "ADVANCE" },
  { tier: "borderline", decision: "REVIEW" },
  { tier: "weak", decision: "DECLINE" },
];

export default async function RubricPage() {
  const rubric = await loadRubric();
  const parsed = rubric.dimensions.length >= 5;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="animate-rise">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
          <ListChecks className="size-3.5 text-brand" /> Screening criteria
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">How candidates are scored</h1>
        {rubric.context && <p className="mt-2 max-w-3xl text-sm text-pretty text-muted">{rubric.context}</p>}
        <p className="mt-2 text-xs text-muted">
          Loaded live from <code className="rounded bg-canvas px-1 py-px ring-1 ring-line">rubric.txt</code>. This is the exact brief Gemini scores every resume against.
        </p>
      </header>

      {/* Tiers + weights */}
      <section className="mt-8 grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <SectionTitle Icon={Target} title="Shortlist thresholds" />
          <p className="mt-1 text-sm text-muted">Weighted score out of 5, rounded to 2 decimals.</p>
          <ul className="mt-4 space-y-2">
            {TIERS.map(({ tier, decision }) => {
              const m = TIER_META[tier];
              return (
                <li key={tier} className={`flex items-center justify-between rounded-lg border-l-4 ${m.accent} ${m.soft} px-3 py-2.5`}>
                  <span>
                    <span className={`block text-sm font-semibold ${m.text}`}>{m.label}</span>
                    <span className="text-xs text-muted">Recommendation: {decision}</span>
                  </span>
                  <span className="text-sm font-semibold text-ink tabular-nums">{m.range}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 pb-3">
            <SectionTitle Icon={Scale} title="Dimension weights" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line bg-canvas/60 text-left text-xs text-muted">
                <th className="px-5 py-2 font-semibold">Dimension</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(Object.keys(DIMENSION_LABELS) as (keyof typeof DIMENSION_LABELS)[]).map((key) => (
                <tr key={key}>
                  <td className="px-5 py-2">
                    <span className="mr-2 font-mono text-xs font-semibold text-muted">{key}</span>
                    <span className="text-ink">{DIMENSION_LABELS[key]}</span>
                  </td>
                  {ROLES.map((r) => {
                    const w = WEIGHTS[r][key];
                    return (
                      <td key={r} className="px-3 py-2 text-right text-ink tabular-nums">
                        {w ? `${Math.round(w * 100)}%` : <span className="text-muted">n/a</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {rubric.rules.length > 0 && (
        <section className="card mt-4 p-5">
          <SectionTitle Icon={ShieldAlert} title="Scoring rules" />
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {rubric.rules.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/85">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {parsed ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ink">The dimensions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {rubric.dimensions.map((d) => (
              <DimensionCard key={d.key} d={d} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {rubric.gate.length > 0 && (
          <div className="card p-5">
            <SectionTitle Icon={MapPin} title="Location gate" />
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink/85">
              {rubric.gate.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
            {rubric.softFlags.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">Soft flags (never reject)</p>
                <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-ink/85">
                  {rubric.softFlags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        {rubric.redFlags.length > 0 && (
          <div className="card p-5">
            <SectionTitle Icon={Flag} title="Red flags (listed, not deducted)" />
            <ul className="mt-3 space-y-2">
              {rubric.redFlags.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/85">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span className="first-letter:uppercase">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {rubric.probes.length > 0 && (
        <section className="card mt-4 p-5">
          <SectionTitle Icon={HelpCircle} title="Interview probes Gemini writes for each candidate" />
          <ol className="mt-3 space-y-3">
            {rubric.probes.map((p, i) => {
              const [name, ...rest] = p.split(":");
              return (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{i + 1}</span>
                  <span className="text-ink/85">
                    <code className="mr-1 font-mono text-xs font-semibold text-ink">{name}</code>
                    {rest.join(":").trim()}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <details className="card group mt-8 overflow-hidden" open={!parsed}>
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-ink select-none hover:bg-canvas">
          <span className="inline-block transition group-open:rotate-90">›</span> Full rubric text
        </summary>
        <pre className="max-h-[60vh] overflow-auto border-t border-line bg-canvas/60 px-5 py-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink/85">
          {rubric.raw}
        </pre>
      </details>
    </main>
  );
}

function SectionTitle({ Icon, title }: { Icon: typeof Flag; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
      <Icon className="size-4 text-brand" /> {title}
    </h2>
  );
}

function DimensionCard({ d }: { d: RubricDimension }) {
  const levelTone = (score: string) =>
    score.startsWith("5") ? TIER_META.strong : score.startsWith("3") ? TIER_META.borderline : TIER_META.weak;

  return (
    <article className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-xs font-semibold text-muted">{d.key}</span>
          <h3 className="font-semibold text-ink">{DIMENSION_LABELS[d.key] ?? d.heading}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted tabular-nums">
          {ROLES.map((r) =>
            WEIGHTS[r][d.key] ? (
              <span key={r}>
                {r}: <span className="font-semibold text-ink">{Math.round(WEIGHTS[r][d.key]! * 100)}%</span>
              </span>
            ) : null,
          )}
        </div>
      </div>
      {d.seniorOnly && (
        <span className="mt-2 w-fit rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">{ROLE_TITLES["Senior PM"]} only</span>
      )}
      <ul className="mt-4 space-y-2">
        {d.levels.map((l, i) => {
          const t = levelTone(l.score);
          return (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className={`grid h-6 min-w-8 shrink-0 place-items-center rounded-md px-1.5 text-xs font-semibold ${t.soft} ${t.text}`}>{l.score}</span>
              <span className="text-ink/85 first-letter:uppercase">{l.description}</span>
            </li>
          );
        })}
      </ul>
      {d.notes.length > 0 && (
        <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">{d.notes.join(" ")}</p>
      )}
    </article>
  );
}
