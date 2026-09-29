import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { DatabaseError, deleteAllCandidates, listCandidates } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  try {
    return NextResponse.json({ candidates: await listCandidates() });
  } catch (err) {
    return dbError(err);
  }
}

export async function DELETE(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  try {
    return NextResponse.json({ deleted: await deleteAllCandidates() });
  } catch (err) {
    return dbError(err);
  }
}

function dbError(err: unknown) {
  console.error("[candidates]", err);
  const message = err instanceof DatabaseError ? err.message : "Couldn't reach the candidate database.";
  return NextResponse.json({ error: message }, { status: 500 });
}
