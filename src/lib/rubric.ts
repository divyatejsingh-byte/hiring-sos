import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DimensionKey } from "./types";

export interface RubricLevel {
  score: string; // "5", "3", "1-2"
  description: string;
}

export interface RubricDimension {
  key: DimensionKey;
  heading: string;
  seniorOnly: boolean;
  levels: RubricLevel[];
  notes: string[];
}

export interface ParsedRubric {
  raw: string;
  context: string;
  rules: string[];
  dimensions: RubricDimension[];
  gate: string[];
  softFlags: string[];
  redFlags: string[];
  probes: string[];
}

const sentences = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=\.)\s+(?=[A-Z"])/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Turns rubric.txt into display sections. The file stays the single source of truth; if its shape
 * changes enough that parsing finds no dimensions, the page falls back to showing the raw text.
 */
export async function loadRubric(): Promise<ParsedRubric> {
  const raw = (await readFile(path.join(process.cwd(), "rubric.txt"), "utf8")).replace(/\r\n?/g, "\n");
  // Everything from OUTPUT FORMAT on is the model's JSON contract, not hiring criteria.
  const criteria = raw.split(/\nOUTPUT FORMAT/)[0];
  const paragraphs = criteria.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const find = (re: RegExp) => paragraphs.find((p) => re.test(p)) ?? "";

  const context =
    paragraphs[0]
      ?.replace(/\s*Role:\s*\{[^}]*\}\.?/, "")
      .replace(/\s+/g, " ")
      .replace(/^You are screening candidates for\s+/i, "Candidates are screened for ") ?? "";

  const rules = [find(/^Treat the CV/), find(/^Score each dimension/)].flatMap(sentences);

  // Dimension lines start with "D1 ", continuation lines are indented.
  const dimBlock = find(/^D1\s/);
  const dimLines: string[] = [];
  for (const line of dimBlock.split("\n")) {
    if (/^D[1-6]\s/.test(line)) dimLines.push(line.trim());
    else if (dimLines.length) dimLines[dimLines.length - 1] += " " + line.trim();
  }

  const dimensions: RubricDimension[] = dimLines.flatMap((line) => {
    const m = line.match(/^(D[1-6])\s+(.+?):\s*(.*)$/);
    if (!m) return [];
    const [, key, heading, body] = m;
    const levels: RubricLevel[] = [];
    const re = /([^;]+?)\s*=\s*([1-5](?:\s*-\s*[1-5])?)\s*(?:;|\.(?=\s|$)|$)/g;
    let last = 0;
    for (let hit = re.exec(body); hit; hit = re.exec(body)) {
      levels.push({ score: hit[2].replace(/\s/g, ""), description: hit[1].trim() });
      last = re.lastIndex;
    }
    return [
      {
        key: key as DimensionKey,
        heading: heading.replace(/\(Senior PM only\)\s*/i, "").trim(),
        seniorOnly: /Senior PM only/i.test(heading),
        levels,
        // Model-facing wording like "set D6 to null" reads oddly to people.
        notes: sentences(body.slice(last)).map((n) => (/set D6 to null/i.test(n) ? "Not scored for the PM role." : n)),
      },
    ];
  });

  const gatePara = find(/^Gate:/);
  const [gatePart, softPart = ""] = gatePara.split(/\n(?=Soft flags)/);
  const gate = sentences(gatePart.replace(/^Gate:\s*/, ""));
  const softFlags = softPart
    .replace(/^Soft flags[^:]*:\s*/, "")
    .replace(/\s+/g, " ")
    .split(/;\s*/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter(Boolean);

  const redFlags = find(/^Red flags/)
    .replace(/^Red flags[^:]*:\s*/, "")
    .replace(/\s+/g, " ")
    .split(/;\s*/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter(Boolean);

  const probePara = find(/^Interview probes/);
  const probes = probePara
    .split("\n")
    .slice(1)
    .reduce<string[]>((acc, line) => {
      if (/^\s{2}\S/.test(line) && !/^\s{4}/.test(line)) acc.push(line.trim());
      else if (acc.length) acc[acc.length - 1] += " " + line.trim();
      return acc;
    }, []);

  return { raw: raw.trim(), context, rules, dimensions, gate, softFlags, redFlags, probes };
}
