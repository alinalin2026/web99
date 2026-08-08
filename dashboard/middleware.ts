import { NextRequest, NextResponse } from "next/server";
import { isOperator } from "@/lib/auth";

/* Everything except Sarah's endpoint, the login page and the customer-facing
   buy/choose pages is operator-only. Enforced here as well as in each route
   so a new dashboard page can't be added without a gate by accident. */

/* Every one of these needs BOTH the page/route itself and its API route
   listed separately — "/choose" does not cover "/api/choose/*", they're
   unrelated path prefixes. Missing the /api one is exactly the bug that
   locked out login: the page loaded, but the endpoint it called was
   silently gated behind the very auth check the page exists to satisfy. */
const PUBLIC = [
  "/api/chat",
  "/api/stripe",
  "/api/login",
  "/api/meta-health", // temporary read-only setup probe; remove after Meta is verified
  "/login",
  "/buy",
  "/choose",
  "/api/choose",
  /* Triggered by Vercel's scheduler, not a logged-in operator — it can't
     carry the operator cookie, so it guards itself with CRON_SECRET
     instead (same shape as /api/stripe guarding itself by signature). */
  "/api/cron",
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (await isOperator(req)) return NextResponse.next();

  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
