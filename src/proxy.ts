import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authMode, isAuthorizedToken } from "@/lib/auth";

/** First line of defence: bounce signed-out visitors to /login. API routes re-check with requireAuth(). */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (authMode() === "misconfigured") {
    const message = "Hiring SOS is locked: set APP_ACCESS_CODE in the server environment and redeploy.";
    return isApi
      ? NextResponse.json({ error: message }, { status: 503 })
      : new NextResponse(message, { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  if (await isAuthorizedToken(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the sign-in page/endpoint and static assets.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
