import { NextRequest, NextResponse } from "next/server";
import { isOperator } from "@/lib/auth";

/* Everything except Sarah's endpoint, the login page and the customer-facing
   buy/choose pages is operator-only. Enforced here as well as in each route
   so a new dashboard page can't be added without a gate by accident. */

const PUBLIC = [
  "/api/chat",
  "/api/stripe",
  "/login",
  "/buy",
  "/choose",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
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
