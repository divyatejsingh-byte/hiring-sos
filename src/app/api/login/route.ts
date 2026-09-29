import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, authMode, isValidCode, tokenFor } from "@/lib/auth";

export async function POST(req: Request) {
  if (authMode() === "misconfigured") {
    return NextResponse.json({ error: "APP_ACCESS_CODE is not configured on the server." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  if (!(await isValidCode(code))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: "That access code isn't right." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await tokenFor(code.trim()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}
