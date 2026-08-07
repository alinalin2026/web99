import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { SETUP_SQL } from "@/db/schema";
import { requireOperator } from "@/lib/auth";

export const runtime = "nodejs";

/* GET /api/setup
   ---------------------------------------------------------------------------
   The one-time "create the database tables" step, done by visiting a URL
   instead of running psql — there's no assumption anyone operating this has
   a terminal.

   Operator-gated (same ADMIN_PASSWORD as everything else) and safe to hit
   more than once: every statement in SETUP_SQL is written to not fail on a
   table, index or type that already exists. */

export async function GET(req: NextRequest) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  try {
    await sql.unsafe(SETUP_SQL);

    const [check] = await sql<{ orders: string | null; events: string | null }[]>`
      SELECT to_regclass('public.orders')::text AS orders,
             to_regclass('public.order_events')::text AS events`;

    const ok = Boolean(check?.orders && check?.events);

    return html(
      ok,
      ok
        ? "Database is set up. The orders and order_events tables exist and are ready."
        : "Ran without error, but the tables still don't show up. Something's off — send this page to whoever's helping you."
    );
  } catch (err) {
    return html(false, `Setup failed: ${(err as Error).message}`);
  }
}

function html(ok: boolean, message: string): NextResponse {
  const body = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web99 setup</title></head>
<body style="font-family:-apple-system,sans-serif;max-width:480px;margin:60px auto;padding:0 20px;color:#141033;">
<h1 style="font-size:20px;">${ok ? "✅ Done" : "⚠️ Not quite"}</h1>
<p style="font-size:16px;line-height:1.5;">${message}</p>
${ok ? '<p><a href="/" style="color:#5b3fe8;font-weight:700;">Go to the order queue →</a></p>' : ""}
</body></html>`;

  return new NextResponse(body, {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
