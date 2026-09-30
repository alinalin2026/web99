import { runInstantPreview, type InstantBrief } from "@/lib/instant-preview";
import { clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/* POST /api/instant-preview
   Body: { businessName, trade, description, location?, language? }
   Response: text/event-stream.
     event: section  — one per section as it finishes, out of order
     event: done
   No auth, no order row — this is the free pre-payment preview. It is called by
   the /start page on the same origin (Nginx maps /api/ to this app). */

/* Unauthenticated and it spends Anthropic tokens, so cap it per IP. In-memory is
   enough on the single AWS box: it only has to stop a runaway page or a bored
   script, not be exact. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_RUNS = 12;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_RUNS) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return false;
}


export async function POST(req: Request) {
  let brief: InstantBrief;
  try {
    const body = await req.json();
    if (!body?.businessName || !body?.trade) {
      return new Response("businessName and trade are required", { status: 400 });
    }
    brief = {
      businessName: String(body.businessName).slice(0, 120),
      trade: String(body.trade).slice(0, 120),
      description: String(body.description || body.trade).slice(0, 1000),
      location: body.location ? String(body.location).slice(0, 120) : undefined,
      language: body.language ? String(body.language).slice(0, 40) : undefined,
    };
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (limited(clientIp(req))) {
    return new Response("Too many previews — try again in a few minutes.", { status: 429 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await runInstantPreview(brief, (e) => send("section", { id: e.id, html: e.html }));
        send("done", {});
      } catch (err) {
        send("error", { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
