import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  to: z.email("Recipient email address is invalid."),
  subject: z.string().trim().min(1, "Subject is required.").max(200),
  body: z.string().trim().min(1, "Message body is required.").max(20_000),
  kind: z.enum(["invite", "rejection"]),
  candidateId: z.string().min(1),
});

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return error("RESEND_API_KEY is not configured on the server.", 500);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  const { to, subject, body, kind, candidateId } = parsed.data;

  const resend = new Resend(apiKey);
  const { data, error: sendError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Hiring <onboarding@resend.dev>",
    to,
    replyTo: process.env.RESEND_REPLY_TO || undefined,
    subject,
    text: body,
    html: toHtml(body),
    tags: [
      { name: "type", value: kind },
      { name: "candidate", value: candidateId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 256) || "unknown" },
    ],
  });

  if (sendError) {
    console.error("[send-email] Resend error", sendError);
    return error(sendError.message || "Resend could not send the email.", 502);
  }

  return NextResponse.json({ id: data?.id });
}

function toHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  const paragraphs = linked
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:560px">${paragraphs}</div>`;
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
