import { NextRequest, NextResponse } from "next/server";
import { sql, logEvent, setState } from "@/lib/db";
import { pushSite } from "@/lib/github";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ===========================================================================
   GET /api/cron/expire-previews
   ---------------------------------------------------------------------------
   The site promises, in three places including the Terms of Service: "Your
   preview stays live for 48 hours... the preview comes down." Nothing
   enforced that until this existed — expires_at was set on every order but
   nothing ever read it, which made that a false statement in a legal
   document the moment real traffic showed up.

   Runs once a day (dashboard/vercel.json) — Vercel's Hobby plan only allows
   daily cron granularity, so "48 hours" is enforced to within about a day.
   For a solo studio's preview links, that slack is fine; it is not fine for
   the promise to be unenforced altogether.

   Gated by CRON_SECRET rather than requireOperator: this is triggered by
   Vercel's scheduler, not a logged-in person, so it needs its own check —
   see Vercel's documented convention of sending `Authorization: Bearer
   $CRON_SECRET` to cron-invoked routes.
   =========================================================================== */

function expiredPage(businessName: string): string {
  const name = businessName || "This preview";
  return `<!doctype html>
<html lang="en-IE"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preview expired — Web99.ie</title>
<meta name="robots" content="noindex">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#efebfe;font-family:-apple-system,sans-serif;padding:24px;}
  .card{max-width:420px;background:#fff;border-radius:16px;padding:36px 30px;text-align:center;
    box-shadow:0 12px 40px rgba(20,16,51,.08)}
  h1{font-size:22px;color:#141033;margin:0 0 12px}
  p{color:#4a4570;line-height:1.55;margin:0 0 22px}
  a{display:inline-block;background:#5b3fe8;color:#fff;text-decoration:none;font-weight:700;
    padding:13px 26px;border-radius:999px}
</style></head>
<body>
  <div class="card">
    <h1>${name}'s preview has expired</h1>
    <p>This preview website was only live for a limited time. If you'd still like it, or want a fresh one, just get in touch.</p>
    <a href="https://web99.ie/start/">Start again at Web99.ie</a>
  </div>
</body></html>`;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const stale = await sql<
    { id: string; slug: string | null; business_name: string | null }[]
  >`
    SELECT id, slug, business_name FROM orders
    WHERE state IN ('sent', 'live')
      AND expires_at IS NOT NULL
      AND expires_at < now()`;

  const results: { id: string; slug: string | null; ok: boolean; error?: string }[] = [];

  for (const order of stale) {
    try {
      if (order.slug) {
        await pushSite(
          order.slug,
          { "index.html": expiredPage(order.business_name ?? "") },
          order.business_name ?? order.slug
        );
      }
      await setState(order.id, "lost", { reason: "preview_expired" });
      results.push({ id: order.id, slug: order.slug, ok: true });
    } catch (err) {
      await logEvent(order.id, "error", {
        step: "expire_preview",
        message: (err as Error).message,
      });
      results.push({ id: order.id, slug: order.slug, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ checked: stale.length, expired: results });
}
