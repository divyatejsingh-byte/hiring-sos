import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Candidate, CandidateStatus, Role, ScreeningResult } from "./types";

let client: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

export class DatabaseError extends Error {}

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseError("DATABASE_URL is not configured on the server.");
  client ??= neon(url);
  return client;
}

/** Creates the table on first use so a fresh Neon branch works without a migration step. */
async function ready() {
  schemaReady ??= (async () => {
    const q = sql();
    await q`
      CREATE TABLE IF NOT EXISTS candidates (
        id          uuid PRIMARY KEY,
        file_name   text NOT NULL,
        role        text NOT NULL CHECK (role IN ('PM', 'Senior PM')),
        status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'review_pending', 'invited', 'rejected')),
        screened_at timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now(),
        result      jsonb NOT NULL
      )`;
    await q`CREATE INDEX IF NOT EXISTS candidates_screened_at_idx ON candidates (screened_at DESC)`;
  })().catch((err) => {
    schemaReady = null; // retry on the next request instead of caching the failure
    throw err;
  });
  return schemaReady;
}

interface Row {
  id: string;
  file_name: string;
  role: Role;
  status: CandidateStatus;
  screened_at: string | Date;
  result: ScreeningResult;
}

function toCandidate(r: Row): Candidate {
  return {
    id: r.id,
    fileName: r.file_name,
    role: r.role,
    status: r.status,
    screenedAt: new Date(r.screened_at).toISOString(),
    result: r.result,
  };
}

export async function listCandidates(): Promise<Candidate[]> {
  await ready();
  const rows = (await sql()`
    SELECT id, file_name, role, status, screened_at, result
    FROM candidates ORDER BY screened_at DESC`) as Row[];
  return rows.map(toCandidate);
}

export async function insertCandidate(input: { fileName: string; role: Role; result: ScreeningResult }): Promise<Candidate> {
  await ready();
  const rows = (await sql()`
    INSERT INTO candidates (id, file_name, role, result)
    VALUES (${crypto.randomUUID()}, ${input.fileName}, ${input.role}, ${JSON.stringify(input.result)}::jsonb)
    RETURNING id, file_name, role, status, screened_at, result`) as Row[];
  return toCandidate(rows[0]);
}

/** Returns the updated candidate, or null if it doesn't exist. */
export async function updateStatus(id: string, status: CandidateStatus): Promise<Candidate | null> {
  await ready();
  const rows = (await sql()`
    UPDATE candidates SET status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING id, file_name, role, status, screened_at, result`) as Row[];
  return rows[0] ? toCandidate(rows[0]) : null;
}

/** Only flips "new" candidates, so opening a review never undoes a sent email. */
export async function markReviewPending(id: string): Promise<Candidate | null> {
  await ready();
  const rows = (await sql()`
    UPDATE candidates SET status = 'review_pending', updated_at = now()
    WHERE id = ${id} AND status = 'new'
    RETURNING id, file_name, role, status, screened_at, result`) as Row[];
  return rows[0] ? toCandidate(rows[0]) : null;
}

export async function deleteAllCandidates(): Promise<number> {
  await ready();
  const rows = (await sql()`DELETE FROM candidates RETURNING id`) as { id: string }[];
  return rows.length;
}
