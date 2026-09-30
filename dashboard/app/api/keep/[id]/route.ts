import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/db";
import { keepForLater, maskEmail, type KeepResult } from "@/lib/keep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* "Keep this for me". POST with JSON {email?} answers JSON (the chat button); POST with a form
   answers a small page (the new-tab bar links to GET, which shows the page). All public — see lib/keep.ts
   for the bounds — and the id is the order's unguessable UUID. */

const PAGE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function page(inner: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en-IE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Keep my website — Web99</title>` +
      `<style>body{margin:0;background:#f6f4fe;color:#141033;font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}main{max-width:30rem;margin:12vh auto;padding:0 1.25rem}` +
      `.card{background:#fff;border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(45,27,143,.12)}h1{font-size:1.4rem;margin:0 0 .6rem}p{margin:0 0 1rem}` +
      `input[type=email]{box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #d9d4f5;border-radius:12px;font:inherit;margin:0 0 12px}` +
      `.btn{display:inline-block;background:#5b3fe8;color:#fff;border:0;border-radius:999px;padding:13px 26px;font:700 16px system-ui,sans-serif;text-decoration:none;cursor:pointer}.muted{color:#6b6790;font-size:.9rem}</style></head>` +
      `<body><main><div class="card">${inner}</div></main></body></html>`,
    { status, headers: PAGE_HEADERS }
  );
}

function backLink(id: string) {
  return `<p class="muted"><a href="/api/instant-site/view/${esc(id)}" style="color:#5b3fe8">← Back to my website</a></p>`;
}

function askForm(id: string, note = "") {
  return (
    `<h1>Keep this website for me</h1><p>We'll email you a private link so you can come back to your website whenever you like, and take it if you love it. Nothing to pay today.</p>${note}` +
    `<form method="post" action="/api/keep/${esc(id)}"><input type="email" name="email" required autocomplete="email" placeholder="you@yourbusiness.ie" aria-label="Your email"><button class="btn" type="submit">Email me the link</button></form>${backLink(id)}`
  );
}

function resultPage(id: string, r: KeepResult): Response {
  switch (r.status) {
    case "sent":
      return page(`<h1>Saved — check your inbox</h1><p>We've emailed a link to <strong>${esc(r.maskedEmail)}</strong>. Open it whenever you're ready — it can take a minute to arrive, and it's worth a look in spam.</p>${backLink(id)}`);
    case "throttled":
      return page(`<h1>Already on its way</h1><p>We sent your link to <strong>${esc(r.maskedEmail)}</strong> a moment ago. Check your inbox (and spam).</p>${backLink(id)}`);
    case "need_email":
      return page(askForm(id));
    case "invalid_email":
      return page(askForm(id, `<p style="color:#b42318">That email doesn't look right — could you check it?</p>`), 400);
    case "no_site":
      return page(`<h1>Not quite ready</h1><p>Your website hasn't finished building yet. Go back to the chat and try again in a minute.</p>`, 409);
    case "not_found":
      return page(`<h1>We couldn't find that</h1><p>The link looks wrong. Head back to the chat and try again.</p>`, 404);
    default:
      return page(`<h1>Something went wrong</h1><p>We couldn't send the email just now. Please try again in a minute — or reply to any email from us and we'll sort it.</p>${backLink(id)}`, 502);
  }
}

const HTTP: Record<KeepResult["status"], number> = { sent: 200, throttled: 200, need_email: 200, invalid_email: 400, no_site: 409, not_found: 404, failed: 502 };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id).catch(() => null);
  if (!order) return resultPage(id, { status: "not_found" });
  // We already hold their email: one click on this page sends it straight to that address.
  if (order.email) {
    return page(
      `<h1>Keep this website for me</h1><p>We'll email a private link to <strong>${esc(maskEmail(order.email))}</strong> so you can come back to your website whenever you like, and take it if you love it. Nothing to pay today.</p>` +
        `<form method="post" action="/api/keep/${esc(id)}"><button class="btn" type="submit">Email me the link</button></form>${backLink(id)}`
    );
  }
  return page(askForm(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = (req.headers.get("content-type") ?? "").includes("application/json");
  let email: string | null = null;
  try {
    if (isJson) email = ((await req.json()) as { email?: unknown })?.email as string | null;
    else email = String((await req.formData()).get("email") ?? "");
  } catch { /* no body: treat as no email */ }
  const result = await keepForLater(id, typeof email === "string" ? email : null).catch((err): KeepResult => {
    console.error("keep-for-later failed", err);
    return { status: "failed" };
  });
  if (!isJson) return resultPage(id, result);
  return NextResponse.json({ ...result }, { status: HTTP[result.status], headers: { "Cache-Control": "no-store" } });
}
