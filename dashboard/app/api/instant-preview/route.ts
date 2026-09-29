import { runInstantPreview, type InstantBrief } from "@/lib/instant-preview";
import { normaliseStyle } from "@/lib/image-library";

export const runtime = "nodejs";
export const maxDuration = 60;

/* POST /api/instant-preview
   Body: { businessName, trade, description, location?, style?, language?, themeOnly? }
   Response: text/event-stream.
     event: theme    — instant, no AI: colours, fonts, imagery (see image-library.ts)
     event: section  — one per section as it finishes, out of order
     event: done
   themeOnly=true returns just the theme, with no AI calls at all — used when the
   customer only changes the look ("bolder", "darker").
   No auth, no order row — this is the free pre-payment preview. It is called by
   the /start page on the same origin (Nginx maps /api/ to this app). */

/* Unauthenticated and it spends OpenAI tokens, so cap it per IP. In-memory is
   enough on the single AWS box: it only has to stop a runaway page or a bored
   script, not be exact. Theme-only calls cost nothing and are not counted. */
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

function clientIp(req: Request): string {
  const f = req.headers.get("x-forwarded-for");
  return (f ? f.split(",")[0]?.trim() : req.headers.get("x-real-ip")) || "unknown";
}

export async function POST(req: Request) {
  let brief: InstantBrief;
  let themeOnly = false;
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
      style: normaliseStyle(body.style),
      language: body.language ? String(body.language).slice(0, 40) : undefined,
    };
    themeOnly = body.themeOnly === true;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!themeOnly && limited(clientIp(req))) {
    return new Response("Too many previews — try again in a few minutes.", { status: 429 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await runInstantPreview(
          brief,
          (e) => (e.type === "theme" ? send("theme", e.theme) : send("section", { id: e.id, html: e.html })),
          { themeOnly }
        );
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
