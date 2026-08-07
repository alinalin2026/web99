import { NextRequest, NextResponse } from "next/server";

/* ===========================================================================
   CORS for /api/chat
   ---------------------------------------------------------------------------
   The only endpoint on this whole app that a BROWSER calls cross-origin: the
   marketing site (web99.ie) and the dashboard (this app) are two separate
   Vercel projects on two separate domains, and /start/'s fetch() sends
   Content-Type: application/json — which isn't a CORS-"simple" content type,
   so the browser sends a preflight OPTIONS request first. With no CORS
   headers at all, that preflight fails and the browser blocks the real
   request before it ever leaves the page. This is exactly the bug that made
   every message to Sarah silently fail — the UI's own network-error fallback
   was firing correctly, on a genuine network-level failure.

   Every other route in this app is either same-origin (called by this app's
   own pages) or called by a non-browser client that doesn't send an Origin
   header at all (Stripe's webhook, Vercel's cron) — CORS is a browser
   mechanism and doesn't apply to those, so this file exists only for /api/chat.

   Restricted to a known allow-list rather than "*". This doesn't stop a
   script from calling the endpoint directly with a spoofed or absent Origin
   header — CORS can't do that, it only constrains browsers acting on behalf
   of a page from an origin the server didn't approve — but it does stop the
   more common case of some other website's page quietly calling this (real
   OpenAI-cost-incurring) endpoint on a visitor's behalf.
   =========================================================================== */

function allowedOrigins(): string[] {
  const configured = process.env.MARKETING_URL;
  const list = new Set(["https://web99.ie", "https://www.web99.ie"]);
  if (configured) list.add(configured.replace(/\/$/, ""));
  return [...list];
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigins();
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

/** Preflight response for OPTIONS /api/chat. */
export function corsPreflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

/** Attaches CORS headers to an already-built response for GET/POST /api/chat. */
export function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const headers = corsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
