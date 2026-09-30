import { NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { fixNavigation, siteOrigin } from "@/lib/instant-site";
import { withPreviewBar } from "@/lib/preview-bar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* The saved full-page preview for an order, served as a real page so it can be
   opened in its own tab instead of the small frame in the chat, with a buy bar on the bottom. Keyed by the
   order's unguessable UUID, same as POST /api/instant-site. The HTML was already
   stripped of scripts/handlers/embeds by finalizeHtml() when it was saved; the
   CSP below is the second lock — even if something slipped through, nothing can run. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headers(framed = false): Record<string, string> {
  const origin = siteOrigin();
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, max-age=60",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": framed ? "SAMEORIGIN" : "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": `default-src 'none'; img-src ${origin} data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; frame-ancestors ${framed ? "'self'" : "'none'"}`,
  };
}

function missing(): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title>` +
      `<body style="font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:20vh auto;padding:0 1.5rem;color:#1b1b2b"><h1 style="font-size:1.4rem">This preview isn't available</h1>` +
      `<p>It hasn't been built yet, or the link is wrong. Head back to the chat to see your website.</p></body>`,
    { status: 404, headers: { ...headers(), "Cache-Control": "no-store" } }
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return missing();
  const rows = await sql<{ html: string | null }[]>`
    SELECT detail->>'html' AS html FROM order_events
    WHERE order_id = ${id} AND kind = 'instant_site' AND detail ? 'html'
    ORDER BY created_at DESC LIMIT 1`;
  const html = rows[0]?.html;
  if (!html) return missing();
  // ?clean=1 is for the operator dashboard: the site as-is, without the customer-facing buy bar.
  // ?frame=1 is the chat's own preview frame: also bar-less (the chat has its own buttons) and
  // allowed to be framed by our own pages only. It's loaded by URL, not srcdoc, so in-page links work.
  const framed = req.nextUrl.searchParams.get("frame") === "1";
  const clean = framed || req.nextUrl.searchParams.get("clean") === "1";
  const page = fixNavigation(html);
  return new Response(clean ? page : withPreviewBar(page, id), { headers: headers(framed) });
}
