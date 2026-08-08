import { NextRequest, NextResponse } from "next/server";
import { chat, json, MODELS, type Turn } from "@/lib/ai";
import { sarahSystemPrompt, extractionPrompt, sarahOpener } from "@/lib/prompts/sarah";
import { sql, jsonb, getOrder, setState, logEvent, type Order } from "@/lib/db";
import { corsPreflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 60;

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

interface ChatBody {
  orderId?: string;
  message?: string;
  history?: Turn[];
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

function safeHistory(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (t): t is Turn =>
        !!t &&
        typeof t === "object" &&
        (t as Turn).role !== undefined &&
        ((t as Turn).role === "user" || (t as Turn).role === "assistant") &&
        typeof (t as Turn).content === "string"
    )
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, 4000) }))
    .filter((t) => t.content.length > 0)
    .slice(-18);
}

async function safeLog(orderId: string | null, kind: string, detail: Record<string, unknown>) {
  if (!orderId) return;
  try {
    await logEvent(orderId, kind, detail);
  } catch (err) {
    console.error("chat logEvent failed", err);
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(req: NextRequest) {
  return withCors(req, NextResponse.json({ opener: sarahOpener }));
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
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

  const browserHistory = safeHistory(body.history);
  let order: Order | null = null;
  let persistenceAvailable = true;

  /* The public conversation should not die just because Postgres is briefly
     unavailable. We still let Sarah answer using the browser-supplied recent
     history, while logging the persistence failure server-side. */
  try {
    order = body.orderId ? await getOrder(body.orderId) : null;

    if (!order) {
      const [created] = await sql<{ id: string }[]>`
        INSERT INTO orders (state, conversation)
        VALUES ('collecting', '[]'::jsonb)
        RETURNING id`;
      order = await getOrder(created.id);
    }
  } catch (err) {
    persistenceAvailable = false;
    console.error("chat persistence unavailable", err);
  }

  if (order && order.state !== "collecting") {
    return withCors(
      req,
      NextResponse.json({
        orderId: order.id,
        reply:
          "Thanks — I've got everything. We'll prepare it from here and email you the link when it's ready.",
        missing: [],
        readyToBuild: true,
      })
    );
  }

  const savedTurns: Turn[] = order
    ? order.conversation.map((t) => ({ role: t.role, content: t.content }))
    : browserHistory;
  const turns: Turn[] = [...savedTurns, { role: "user", content: message }];

  let reply: string;
  try {
    reply = await chat(sarahSystemPrompt(), turns, MODELS.sarah);
  } catch (err) {
    await safeLog(order?.id ?? null, "error", { step: "sarah", message: (err as Error).message });
    return withCors(
      req,
      NextResponse.json({
        orderId: order?.id ?? null,
        reply:
          "Sorry — I couldn't get a reply through just now. Please try that message once more, or ring us on (01) 234 3300.",
        missing: [],
        readyToBuild: false,
        retryable: true,
      })
    );
  }

  const now = new Date().toISOString();
  const conversation = [
    ...(order?.conversation ?? browserHistory.map((t) => ({ ...t, at: now }))),
    { role: "user" as const, content: message, at: now },
    { role: "assistant" as const, content: reply, at: now },
  ];

  let brief: Brief | null = null;
  try {
    const transcript = conversation
      .map((t) => `${t.role === "user" ? "OWNER" : "SARAH"}: ${t.content}`)
      .join("\n\n");
    brief = await json<Brief>(extractionPrompt(), transcript, MODELS.extract, 1200);
  } catch (err) {
    await safeLog(order?.id ?? null, "error", { step: "extract", message: (err as Error).message });
  }

  if (order && persistenceAvailable) {
    try {
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
    } catch (err) {
      persistenceAvailable = false;
      console.error("chat save failed", err);
    }
  }

  const missing = brief
    ? REQUIRED.filter((k) => {
        const v = brief![k];
        return v == null || (Array.isArray(v) && v.length === 0);
      }).map(String)
    : REQUIRED.map(String);

  /* Never tell the browser the lead is ready unless it has actually been
     persisted. This prevents a DB outage from making a customer's details
     disappear while the UI claims the job has been handed over. */
  const ready =
    !!order && persistenceAvailable && missing.length === 0 && brief?.readyToBuild === true;

  if (ready && order) {
    try {
      await setState(order.id, "ready", { source: "customer_confirmed" });
      await safeLog(order.id, "state_change", { step: "lead_ready_for_plan" });
    } catch (err) {
      console.error("chat ready state save failed", err);
      return withCors(
        req,
        NextResponse.json({
          orderId: order.id,
          reply:
            "I've got your details, but I couldn't save the final confirmation just now. Please tap confirm once more in a moment.",
          missing: [],
          readyToBuild: false,
          retryable: true,
        })
      );
    }
  }

  return withCors(
    req,
    NextResponse.json({
      orderId: order?.id ?? null,
      reply,
      missing,
      readyToBuild: ready,
      temporary: !persistenceAvailable,
    })
  );
}
