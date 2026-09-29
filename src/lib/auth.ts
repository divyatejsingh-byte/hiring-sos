// Shared by proxy.ts and API routes, so it must stay runtime-agnostic (Web Crypto only).

export const AUTH_COOKIE = "hsos_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function accessCode(): string | null {
  return process.env.APP_ACCESS_CODE?.trim() || null;
}

/** The gate is optional locally but mandatory in production: an unset code must never mean "open". */
export function authMode(): "enforced" | "disabled" | "misconfigured" {
  if (accessCode()) return "enforced";
  return process.env.NODE_ENV === "production" ? "misconfigured" : "disabled";
}

/** Cookie value: a hash of the code, so the code itself never sits in the browser. */
export async function tokenFor(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`hiring-sos:v1:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidCode(candidate: string): Promise<boolean> {
  const code = accessCode();
  if (!code) return false;
  return safeEqual(await tokenFor(candidate.trim()), await tokenFor(code));
}

export async function isAuthorizedToken(token: string | undefined): Promise<boolean> {
  const mode = authMode();
  if (mode === "disabled") return true;
  if (mode === "misconfigured" || !token) return false;
  return safeEqual(token, await tokenFor(accessCode()!));
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/** For API routes: returns a 401/503 response to send back, or null when the request may proceed. */
export async function requireAuth(req: Request): Promise<Response | null> {
  if (authMode() === "misconfigured") {
    return Response.json({ error: "APP_ACCESS_CODE is not configured on the server." }, { status: 503 });
  }
  if (await isAuthorizedToken(readCookie(req, AUTH_COOKIE))) return null;
  return Response.json({ error: "Please sign in again." }, { status: 401 });
}
