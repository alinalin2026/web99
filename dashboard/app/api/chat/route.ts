import { NextRequest, NextResponse } from "next/server";
import { chat, json, MODELS } from "@/lib/ai";
import { sarahSystemPrompt, extractionPrompt, sarahOpener } from "@/lib/prompts/sarah";
import { sql, jsonb, getOrder, setState, logEvent } from "@/lib/db";
import { analyse } from "@/lib/pipeline";
import { onTheWay, send } from "@/lib/email";
import { corsPreflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ===========================================================================
   POST /api/chat
   ---------------------------------------------------------------------------
   The only endpoint the marketing site talks to.

   Body:  { orderId?: string, message: string }
   Reply: { orderId, reply, missing: string[], readyToBuild: boolean }

   One order row per conversation, created on the first message. An abandoned
   chat stays as a `collecting` row rather than vanishing — half a conversation
   with a phone number in it is still a lead.
   =========================================================================== */

interface Brief {
  businessName: string | null;
  trade: string | null;
  location: string | null;
  services: string[] | null;
  hours: string | null;
  phone: string | null;
  email: string | null;
  readyToBuild?: boolean;
  [k: string]: unknown;
}

const REQUIRED: (keyof Brief)[] = [
  "businessName",
  "trade",
  "location",
  "services",
  "hours",
  "phone",
  "email",
];

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(req: NextRequest) {
  /* Lets the front end render Sarah's opener without hardcoding it twice. */
  return withCors(req, NextResponse.json({ opener: sarahOpener }));
}

export async function POST(req: NextRequest) {
  let body: { orderId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return withCors(req, NextResponse.json({ error: "Bad JSON" }, { status: 400 }));
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return withCors(req, NextResponse.json({ error: "Empty message" }, { status: 400 }));
  }
  if (message.length > 4000) {
    return withCors(req, NextResponse.json({ error: "Message too long" }, { status: 400 }));
  }

  /* --- find or create the order ------------------------------------------ */
  let order = body.orderId ? await getOrder(body.orderId) : null;

  if (!order) {
    const [created] = await sql<{ id: string }[]>`
      INSERT INTO orders (state, conversation)
      VALUES ('collecting', '[]'::jsonb)
      RETURNING id`;
    order = await getOrder(created.id);
    if (!order) {
      return withCors(req, NextResponse.json({ error: "Could not create order" }, { status: 500 }));
    }
  }

  /* Once it's past collecting, Sarah is done — don't let a stray message
     reopen an order that's already building or live. */
  if (order.state !== "collecting") {
    return withCors(
      req,
      NextResponse.json({
        orderId: order.id,
        reply:
          "Thanks — I've got everything and your website is being built. Keep an eye on your email, it'll be with you tomorrow.",
        missing: [],
        readyToBuild: true,
      })
    );
  }

  const turns = [
    ...order.conversation.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: message },
  ];

  /* --- Sarah replies ------------------------------------------------------ */
  let reply: string;
  try {
    reply = await chat(sarahSystemPrompt(), turns, MODELS.sarah);
  } catch (err) {
    await logEvent(order.id, "error", { step: "sarah", message: (err as Error).message });
    return withCors(
      req,
      NextResponse.json(
        {
          orderId: order.id,
          reply:
            "Sorry — something went wrong my end. Give me a second and try that again, or ring us on (01) 234 3300.",
          missing: [],
          readyToBuild: false,
        },
        { status: 200 }
      )
    );
  }

  const now = new Date().toISOString();
  const conversation = [
    ...order.conversation,
    { role: "user" as const, content: message, at: now },
    { role: "assistant" as const, content: reply, at: now },
  ];

  /* --- extract, so the dashboard sees a half-finished order live ---------- */
  let brief: Brief | null = null;
  try {
    const transcript = conversation
      .map((t) => `${t.role === "user" ? "OWNER" : "SARAH"}: ${t.content}`)
      .join("\n\n");
    brief = await json<Brief>(extractionPrompt(), transcript, MODELS.extract, 1200);
  } catch (err) {
    /* Extraction failing must never break the conversation. The customer keeps
       talking; the dashboard just shows a staler brief for one turn. */
    await logEvent(order.id, "error", { step: "extract", message: (err as Error).message });
  }

  await sql`
    UPDATE orders SET
      conversation  = ${jsonb(conversation)},
      brief         = ${brief ? jsonb(brief) : order.brief ? jsonb(order.brief) : null},
      business_name = ${brief?.businessName ?? order.business_name},
      trade         = ${brief?.trade ?? order.trade},
      location      = ${brief?.location ?? order.location},
      email         = ${brief?.email ?? order.email},
      phone         = ${brief?.phone ?? order.phone}
    WHERE id = ${order.id}`;

  const missing = brief
    ? REQUIRED.filter((k) => {
        const v = brief![k];
        return v == null || (Array.isArray(v) && v.length === 0);
      }).map(String)
    : REQUIRED.map(String);

  const ready = missing.length === 0;

  /* --- everything collected: hand off to the pipeline --------------------- */
  if (ready) {
    await setState(order.id, "ready");

    if (brief?.email) {
      try {
        await send(
          brief.email,
          onTheWay("", brief.businessName ?? "your business")
        );
        await sql`UPDATE orders SET sent_at = now() WHERE id = ${order.id}`;
        await logEvent(order.id, "email", { template: "onTheWay", to: brief.email });
      } catch (err) {
        await logEvent(order.id, "error", { step: "email", message: (err as Error).message });
      }
    }

    /* Fire and forget — the customer shouldn't wait on a 60-second build. */
    void analyse(order.id).catch(() => {});
  }

  return withCors(req, NextResponse.json({ orderId: order.id, reply, missing, readyToBuild: ready }));
}
