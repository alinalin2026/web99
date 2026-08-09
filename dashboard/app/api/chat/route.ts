import { NextRequest, NextResponse } from "next/server";
import { chat, json, MODELS, type Turn } from "@/lib/ai";
import { sarahSystemPrompt, extractionPrompt, sarahOpener } from "@/lib/prompts/sarah";
import {
  ensureMasterSchema, sql, jsonb, getOrder, setState, logEvent, scheduleLeadFollowups, syncQualification, type Order,
} from "@/lib/db";
import { corsPreflight, withCors } from "@/lib/cors";
import { resolveMetaPixelId } from "@/lib/meta-sales";
import { sendMetaConversion } from "@/lib/meta-conversions";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Brief {
  businessName: string | null; trade: string | null; location: string | null;
  websiteGoal: string | null; services: string[] | null; hours: string | null;
  phone: string | null; email: string | null; anythingElseClosed?: boolean;
  readyToBuild?: boolean; attribution?: Record<string, string | number> | null;
  trackingConsent?: boolean; [k: string]: unknown;
}
interface ChatBody { orderId?: string; message?: string; history?: Turn[]; attribution?: unknown; trackingConsent?: boolean }
type QuickReply = { label: string; value: string };

const REQUIRED: (keyof Brief)[] = ["trade", "websiteGoal", "email"];
const ATTR_KEYS = ["fbclid","utm_source","utm_medium","utm_campaign","utm_content","utm_term","landing_url","landing_path","landed_at","user_agent"] as const;

function safeAttribution(value: unknown): Record<string, string | number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>; const clean: Record<string, string | number> = {};
  for (const key of ATTR_KEYS) {
    const v = source[key];
    if (typeof v === "number" && Number.isFinite(v)) clean[key] = v;
    if (typeof v === "string" && v.trim()) clean[key] = v.trim().slice(0, key === "landing_url" ? 2000 : 1000);
  }
  return Object.keys(clean).length ? clean : null;
}
function safeHistory(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is Turn => !!t && typeof t === "object" && ((t as Turn).role === "user" || (t as Turn).role === "assistant") && typeof (t as Turn).content === "string")
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, 4000) })).filter((t) => t.content).slice(-18);
}
function parseSarahReply(raw: string): { reply: string; quickReplies: QuickReply[] } {
  const marker = /\s*\[\[OPTIONS:\s*([^\]]+)\]\]\s*$/i; const match = raw.match(marker);
  if (!match) return { reply: raw.trim(), quickReplies: [] };
  const labels = match[1].split("|").map((p) => p.trim().replace(/\s+/g, " ").slice(0, 48)).filter(Boolean).slice(0, 3);
  if (labels.length < 2) return { reply: raw.replace(marker, "").trim(), quickReplies: [] };
  return { reply: raw.replace(marker, "").trim(), quickReplies: labels.map((label) => ({ label, value: label })) };
}
function clientIp(req: NextRequest): string | null {
  const f = req.headers.get("x-forwarded-for"); return f ? f.split(",")[0]?.trim() || null : req.headers.get("x-real-ip");
}
async function safeLog(orderId: string | null, kind: string, detail: Record<string, unknown>) {
  if (!orderId) return; try { await logEvent(orderId, kind, detail); } catch (err) { console.error("chat logEvent failed", err); }
}

export async function OPTIONS(req: NextRequest) { return corsPreflight(req); }
export async function GET(req: NextRequest) {
  let metaPixelId: string | null = null;
  try { metaPixelId = await resolveMetaPixelId(false); } catch (error) { console.error("tracking config pixel lookup failed", error); }
  return withCors(req, NextResponse.json({ opener: sarahOpener, metaPixelId }));
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try { body = await req.json(); } catch { return withCors(req, NextResponse.json({ error: "Bad JSON" }, { status: 400 })); }
  const message = (body.message ?? "").trim();
  if (!message) return withCors(req, NextResponse.json({ error: "Empty message" }, { status: 400 }));
  if (message.length > 4000) return withCors(req, NextResponse.json({ error: "Message too long" }, { status: 400 }));

  const browserHistory = safeHistory(body.history); const attribution = safeAttribution(body.attribution);
  let order: Order | null = null; let persistenceAvailable = true;
  try {
    await ensureMasterSchema();
    order = body.orderId ? await getOrder(body.orderId) : null;
    if (!order) {
      const [created] = await sql<{ id: string }[]>`INSERT INTO orders (state, conversation, workflow_stage) VALUES ('collecting', '[]'::jsonb, 'new') RETURNING id`;
      order = await getOrder(created.id);
    }
  } catch (err) { persistenceAvailable = false; console.error("chat persistence unavailable", err); }

  if (order && order.state !== "collecting") {
    return withCors(req, NextResponse.json({ orderId: order.id, reply: "Thanks — we've got enough to get started. We'll send the first draft to your email when it's ready.", quickReplies: [], missing: [], readyToBuild: true }));
  }

  const savedTurns: Turn[] = order ? order.conversation.map((t) => ({ role: t.role, content: t.content })) : browserHistory;
  const turns: Turn[] = [...savedTurns, { role: "user", content: message }];
  let modelReply: string;
  try { modelReply = await chat(sarahSystemPrompt(), turns, MODELS.sarah); }
  catch (err) {
    await safeLog(order?.id ?? null, "error", { step: "sarah", message: (err as Error).message });
    return withCors(req, NextResponse.json({ orderId: order?.id ?? null, reply: "Sorry — I couldn't get a reply through just now. Please try that message once more, or ring us on (01) 234 3300.", quickReplies: [], missing: [], readyToBuild: false, retryable: true }));
  }

  const parsed = parseSarahReply(modelReply); const now = new Date().toISOString();
  const conversation = [...(order?.conversation ?? browserHistory.map((t) => ({ ...t, at: now }))), { role: "user" as const, content: message, at: now }, { role: "assistant" as const, content: parsed.reply, at: now }];

  let brief: Brief | null = null;
  try {
    const transcript = conversation.map((t) => `${t.role === "user" ? "OWNER" : "SARAH"}: ${t.content}`).join("\n\n");
    brief = await json<Brief>(extractionPrompt(), transcript, MODELS.extract, 1400);
  } catch (err) { await safeLog(order?.id ?? null, "error", { step: "extract", message: (err as Error).message }); }
  if (!brief && order?.brief) brief = order.brief as Brief;
  if (brief) {
    if (attribution) brief.attribution = attribution;
    if (typeof body.trackingConsent === "boolean") brief.trackingConsent = body.trackingConsent;
  }

  if (order && persistenceAvailable) {
    try {
      await sql`UPDATE orders SET conversation=${jsonb(conversation)}, brief=${brief ? jsonb(brief) : order.brief ? jsonb(order.brief) : null}, business_name=${brief?.businessName ?? order.business_name}, trade=${brief?.trade ?? order.trade}, location=${brief?.location ?? order.location}, email=${brief?.email ?? order.email}, phone=${brief?.phone ?? order.phone} WHERE id=${order.id}`;
      const fresh = await getOrder(order.id);
      if (fresh) {
        const qualification = await syncQualification(fresh);
        if (qualification === "needs_customer") await sql`UPDATE orders SET workflow_stage='needs_customer' WHERE id=${order.id}`;
        await scheduleLeadFollowups(order.id);
      }
    } catch (err) { persistenceAvailable = false; console.error("chat save failed", err); }
  }

  const missing = brief ? REQUIRED.filter((k) => { const v = brief![k]; return v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length); }).map(String) : REQUIRED.map(String);
  if (!brief?.anythingElseClosed) missing.push("anythingElse");
  const ready = !!order && persistenceAvailable && missing.length === 0 && brief?.readyToBuild === true;

  if (ready && order) {
    try {
      await setState(order.id, "ready", { source: "customer_brief_complete" });
      await sql`UPDATE orders SET qualification='lead', workflow_stage='new' WHERE id=${order.id}`;
      await sql`UPDATE followups SET status='cancelled' WHERE order_id=${order.id} AND status='pending'`;
      await safeLog(order.id, "lead_ready", { message: `${brief?.businessName || brief?.trade || "Lead"} is ready to queue` });
      if (brief?.trackingConsent === true) {
        const meta = await sendMetaConversion({ eventName: "Lead", eventId: `lead_${order.id}`, email: brief.email, attribution: brief.attribution, clientIp: clientIp(req), eventSourceUrl: typeof brief.attribution?.landing_url === "string" ? brief.attribution.landing_url : "https://web99.ie/start/", value: 99, currency: "EUR" });
        await safeLog(order.id, meta.ok ? "meta_conversion" : "meta_conversion_error", { event: "Lead", eventId: `lead_${order.id}`, pixelId: meta.pixelId ?? null, error: meta.error ?? null });
      }
    } catch (err) {
      console.error("chat ready state save failed", err);
      return withCors(req, NextResponse.json({ orderId: order.id, reply: "I've got your brief, but I couldn't save it just now. Please send that email once more in a moment.", quickReplies: [], missing: [], readyToBuild: false, retryable: true }));
    }
  }

  return withCors(req, NextResponse.json({ orderId: order?.id ?? null, reply: parsed.reply, quickReplies: ready ? [] : parsed.quickReplies, missing, readyToBuild: ready, temporary: !persistenceAvailable }));
}
