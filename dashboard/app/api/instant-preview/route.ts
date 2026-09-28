import { runInstantPreview, type InstantBrief } from "@/lib/instant-preview";

export const runtime = "nodejs";

/* POST /api/instant-preview
   Body: { businessName, trade, description, location? }
   Response: text/event-stream. One "section" event per section as it finishes
   (out of order — whichever call comes back first goes first), then one
   "done" event. No auth, no order row — this is the free pre-payment demo.
   Rate-limit / bot-check this route at the edge if it gets hit hard, since
   it's unauthenticated and calls OpenAI per request. */
export async function POST(req: Request) {
  let brief: InstantBrief;
  try {
    const body = await req.json();
    if (!body?.businessName || !body?.trade || !body?.description) {
      return new Response("businessName, trade and description are required", { status: 400 });
    }
    brief = {
      businessName: String(body.businessName).slice(0, 120),
      trade: String(body.trade).slice(0, 120),
      description: String(body.description).slice(0, 1000),
      location: body.location ? String(body.location).slice(0, 120) : undefined,
    };
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await runInstantPreview(brief, (section) => send("section", section));
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
    },
  });
}
