import { NextRequest, NextResponse } from "next/server";
import { UNSUBSCRIBE_UUID, unsubscribeOrder, unsubscribePage } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const html = (body: string, status = 200) =>
  new NextResponse(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });

/* GET only asks "are you sure?" — mail scanners open links, so a GET must never unsubscribe anyone by itself. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UNSUBSCRIBE_UUID.test(id)) return html(unsubscribePage("missing", ""), 404);
  return html(unsubscribePage("confirm", new URL(req.url).pathname));
}

/* POST is both the confirm button and the one-click unsubscribe mail apps send (RFC 8058). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await unsubscribeOrder(id);
  return ok ? html(unsubscribePage("done", "")) : html(unsubscribePage("missing", ""), 404);
}
