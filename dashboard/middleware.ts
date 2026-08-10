import { NextRequest, NextResponse } from "next/server";
import { isOperator } from "@/lib/auth";

const BASE_PATH = "/control";

/* Next may expose middleware paths either with or without basePath depending on
   the request shape. Normalize once so the auth rules stay stable. */
function appPath(pathname: string): string {
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(BASE_PATH + "/")) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}

/* Everything except Sarah's endpoint, the login page and customer-facing
   payment/choice endpoints is operator-only. */
const PUBLIC = [
  "/api/chat",
  "/api/stripe",
  "/api/login",
  "/login",
  "/buy",
  "/choose",
  "/api/choose",
  "/api/cron",
];

export function isPublicPath(pathname: string): boolean {
  const normalized = appPath(pathname);
  return PUBLIC.some((p) => normalized === p || normalized.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const normalized = appPath(pathname);

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (await isOperator(req)) return NextResponse.next();

  // The dashboard really lives under /control. Never send an operator to the
  // marketing site's /login route.
  const login = new URL(`${BASE_PATH}/login`, req.url);
  login.searchParams.set("next", normalized);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
