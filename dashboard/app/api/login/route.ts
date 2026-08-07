import { NextRequest, NextResponse } from "next/server";
import { checkSecret, sessionToken, OPERATOR_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.OPERATOR_SECRET) {
    return NextResponse.json({ error: "OPERATOR_SECRET is not set." }, { status: 503 });
  }

  const { secret } = (await req.json()) as { secret?: string };
  if (!secret) return NextResponse.json({ error: "No key" }, { status: 400 });

  if (!(await checkSecret(secret))) {
    /* Slow guessing down a little without holding the connection open long. */
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "No" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPERATOR_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
