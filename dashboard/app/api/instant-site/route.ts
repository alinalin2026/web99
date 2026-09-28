import { NextRequest } from "next/server";
import { ensureMasterSchema, getOrder, logEvent, sql } from "@/lib/db";
import { generateInstantSite } from "@/lib/instant-site";

export const runtime = "nodejs";
export const maxDuration = 200;

/* POST /api/instant-site   Body: { orderId }
   Streams text/event-stream: "progress" {pct}, then "page" {html}, then "done"
   (or "error" {message}). The brief is built server-side from the owner's own
   chat messages already saved on the order, so the browser cannot inject a
   prompt. Result is cached on the order (order_events kind "instant_site"), so
   a refresh or a second call gets the same page without another model call.

   Public route (see middleware PUBLIC) that spends real money per call, so it
   is bounded three ways: the order must exist and have >=3 owner messages,
   one generation per order, and a small per-IP hourly + global concurrency cap.
   Rate-limit state is per Node process — fine for a single-instance box. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const MAX_PER_IP_PER_HOUR = 4;
const MAX_ACTIVE = 4;

const running = new Set<string>();
const byIp = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const f = req.headers.get("x-forwarded-for");
  return (f ? f.split(",")[0]?.trim() : req.headers.get("x-real-ip")) || "unknown";
}

function overIpLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (byIp.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  byIp.set(ip, recent);
  return recent.length >= MAX_PER_IP_PER_HOUR;
}

function ownerBrief(conversation: { role: string; content: string }[]): string | null {
  const owner = conversation.filter((t) => t.role === "user").map((t) => t.content.trim());
  if (owner.length < 3) return null;
  const name = owner[0].replace(EMAIL, "").trim();
  const rest = owner
    .slice(1)
    .map((t) => t.replace(EMAIL, "").trim())
    .filter(Boolean);
  if (!name || !rest.length) return null;
  return `Business name (their first answer): ${name}\n\nThen they said:\n${rest.join("\n")}`.slice(0, 3000);
}

function sse(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  let closed = false;
  return {
    send(event: string, data: unknown) {
      if (closed) return;
      try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { closed = true; }
    },
    ping() {
      if (closed) return;
      try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { closed = true; }
    },
    close() {
      if (closed) return;
      closed = true;
      try { controller.close(); } catch { /* already closed */ }
    },
  };
}

const HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export async function POST(req: NextRequest) {
  let orderId: unknown;
  try { orderId = (await req.json())?.orderId; } catch { return new Response("Invalid JSON body", { status: 400 }); }
  if (typeof orderId !== "string" || !UUID.test(orderId)) return new Response("orderId is required", { status: 400 });

  let brief: string | null = null;
  let cachedHtml: string | null = null;
  try {
    await ensureMasterSchema();
    const order = await getOrder(orderId);
    if (!order) return new Response("Unknown order", { status: 404 });
    brief = ownerBrief(order.conversation);
    const cached = await sql<{ html: string | null }[]>`
      SELECT detail->>'html' AS html FROM order_events
      WHERE order_id = ${orderId} AND kind = 'instant_site' AND detail ? 'html'
      ORDER BY created_at DESC LIMIT 1`;
    cachedHtml = cached[0]?.html ?? null;
  } catch (err) {
    console.error("instant-site lookup failed", err);
    return new Response("Temporarily unavailable", { status: 503 });
  }

  if (cachedHtml) {
    const html = cachedHtml;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const out = sse(controller);
        out.send("page", { html });
        out.send("done", {});
        out.close();
      },
    });
    return new Response(stream, { headers: HEADERS });
  }

  if (!brief) return new Response("Not enough information yet", { status: 400 });
  if (running.has(orderId)) return new Response("Already generating", { status: 409 });
  const ip = clientIp(req);
  if (overIpLimit(ip) || running.size >= MAX_ACTIVE) return new Response("Busy, try again shortly", { status: 429 });

  running.add(orderId);
  byIp.set(ip, [...(byIp.get(ip) ?? []), Date.now()]);
  const ownerText = brief;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const out = sse(controller);
      const keepalive = setInterval(() => out.ping(), 10_000);
      try {
        const result = await generateInstantSite(ownerText, (pct) => out.send("progress", { pct }), AbortSignal.timeout(170_000));
        try {
          await logEvent(orderId as string, "instant_site", { html: result.html, ms: result.ms, outputChars: result.outputChars });
        } catch (err) { console.error("instant-site cache write failed", err); }
        out.send("page", { html: result.html });
        out.send("done", {});
      } catch (err) {
        const message = (err as Error).message;
        console.error("instant-site failed", message);
        try { await logEvent(orderId as string, "error", { step: "instant_site", message }); } catch { /* best effort */ }
        out.send("error", { message: "Could not build the full preview right now." });
      } finally {
        clearInterval(keepalive);
        running.delete(orderId as string);
        out.close();
      }
    },
  });
  return new Response(stream, { headers: HEADERS });
}
