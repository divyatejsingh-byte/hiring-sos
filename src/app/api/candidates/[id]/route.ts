import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { markReviewPending } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({ action: z.literal("review") });

/**
 * Only "review" is settable directly. Invited / Rejected are written by /api/send-email
 * after the email actually goes out, so a status can never claim an email that wasn't sent.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Unknown candidate." }, { status: 404 });
  if (!bodySchema.safeParse(await req.json().catch(() => null)).success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    // null means it wasn't "new" (already reviewed or emailed), which is fine.
    const candidate = await markReviewPending(id);
    return NextResponse.json({ candidate });
  } catch (err) {
    console.error("[candidates/:id]", err);
    return NextResponse.json({ error: "Couldn't update this candidate." }, { status: 500 });
  }
}
