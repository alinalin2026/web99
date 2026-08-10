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

/* Public-to-middleware endpoints. Some are genuinely public; others (notably
   /api/ops-agent) intentionally bypass the browser-login redirect because the
   route performs its own explicit bearer/cookie authentication and must return
   JSON 401 rather than HTML/redirects to API callers. */
const PUBLIC = [
  "/api/chat",
  "/api/stripe",
  "/api/login",
  "/api/health",
  "/api/ops-agent",
  "/login",
  "/buy",
  "/choose",
  "/demo",
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

  const login = new URL(`${BASE_PATH}/login`, req.url);
  login.searchParams.set("next", normalized);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
