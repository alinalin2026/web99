import { after, NextRequest, NextResponse } from "next/server";
import { chat, json, MODELS, type Turn } from "@/lib/ai";
import { sarahSystemPrompt, extractionPrompt, sarahOpener } from "@/lib/prompts/sarah";
import { parseSarahReply, conversationFacts } from "@/lib/sarah-reply";
import { lastAssistantStep, confirmCount, decideStep, quickFinished, FINISHED_CLASSIFIER, type FlowTurn, type Step } from "@/lib/sarah-flow";
import {
  ensureMasterSchema, sql, jsonb, getOrder, setState, logEvent, scheduleLeadFollowups, syncQualification, type Order,
} from "@/lib/db";
import { corsPreflight, withCors } from "@/lib/cors";
import { resolveMetaPixelId } from "@/lib/meta-sales";
import { sendMetaConversion } from "@/lib/meta-conversions";
import { saveUploadedFile, AttachmentError, MAX_FILES_PER_MESSAGE } from "@/lib/attachments";
import { sendCustomEmail } from "@/lib/custom-email";

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
type UploadedFile = { id: string; filename: string; mimeType: string; size: number };

const REQUIRED: (keyof Brief)[] = ["trade", "websiteGoal", "email"];
const ATTR_KEYS = ["fbclid","utm_source","utm_medium","utm_campaign","utm_content","utm_term","landing_url","landing_path","landed_at","user_agent"] as const;
const GREETING_RE = /^(hi|hello|hey|hiya|howdy|yo|good\s+(morning|afternoon|evening))[!.?\s]*$/i;

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
async function classifyFinished(message: string): Promise<boolean> {
  try {
    const r = await json<{ finished?: boolean }>(FINISHED_CLASSIFIER, message, MODELS.extract, 300, "minimal");
    return r.finished === true;
  } catch (err) {
    console.error("chat finished-classifier failed", err);
    return false;
  }
}
const STEPS_WITH_BUTTONS: Step[] = ["confirm", "whatsapp"];
function clientIp(req: NextRequest): string | null {
  const f = req.headers.get("x-forwarded-for"); return f ? f.split(",")[0]?.trim() || null : req.headers.get("x-real-ip");
}
function missingFromBrief(brief: Brief | null): string[] {
  const missing = brief ? REQUIRED.filter((k) => { const v = brief[k]; return v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length); }).map(String) : REQUIRED.map(String);
  if (!brief?.anythingElseClosed) missing.push("anythingElse");
  return missing;
}
async function safeLog(orderId: string | null, kind: string, detail: Record<string, unknown>) {
  if (!orderId) return; try { await logEvent(orderId, kind, detail); } catch (err) { console.error("chat logEvent failed", err); }
}

// Fires once, the moment Sarah captures a lead's email — distinct from the
// 30m "did you get interrupted" followup, which only covers stalled chats.
// This one fires on successful capture regardless of what happens next.
function emailCapturedCopy() {
  return {
    subject: "We've got your message",
    body: `Hi,\n\nThanks for getting in touch. A first look at your website's design is being built on the page you were just chatting on, so keep that tab open to watch it come together. No card needed to see it, and nothing has been charged.\n\nIf you closed the page, head back to https://web99.ie/start and tell us about your business again.\n\nTalk soon,\nAlan\nWeb99.ie`,
  };
}

export async function OPTIONS(req: NextRequest) { return corsPreflight(req); }
export async function GET(req: NextRequest) {
  let metaPixelId: string | null = null;
  try { metaPixelId = await resolveMetaPixelId(false); } catch (error) { console.error("tracking config pixel lookup failed", error); }
  return withCors(req, NextResponse.json({ opener: sarahOpener, metaPixelId }));
}

export async function POST(req: NextRequest) {
  let body: ChatBody; let incomingFiles: File[] = [];
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try { form = await req.formData(); } catch { return withCors(req, NextResponse.json({ error: "Bad upload" }, { status: 400 })); }
    let attribution: unknown = null;
    const rawAttribution = form.get("attribution");
    if (typeof rawAttribution === "string" && rawAttribution) {
      try { attribution = JSON.parse(rawAttribution); } catch { /* ignore malformed attribution */ }
    }
    body = {
      orderId: typeof form.get("orderId") === "string" ? (form.get("orderId") as string) : undefined,
      message: typeof form.get("message") === "string" ? (form.get("message") as string) : "",
      attribution,
      trackingConsent: form.get("trackingConsent") === "true",
    };
    incomingFiles = form.getAll("files").filter((v): v is File => v instanceof File && v.size > 0);
    if (incomingFiles.length > MAX_FILES_PER_MESSAGE) {
      return withCors(req, NextResponse.json({ error: `Please attach ${MAX_FILES_PER_MESSAGE} files or fewer at a time.` }, { status: 400 }));
    }
  } else {
    try { body = await req.json(); } catch { return withCors(req, NextResponse.json({ error: "Bad JSON" }, { status: 400 })); }
  }

  const message = (body.message ?? "").trim();
  if (!message && incomingFiles.length === 0) return withCors(req, NextResponse.json({ error: "Empty message" }, { status: 400 }));
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
    return withCors(req, NextResponse.json({ orderId: order.id, reply: "You're all set — your preview is right below the chat. Ready to make it real?", quickReplies: [], missing: [], readyToBuild: true }));
  }

  let uploaded: UploadedFile[] = [];
  if (incomingFiles.length > 0) {
    if (!order || !persistenceAvailable) {
      return withCors(req, NextResponse.json({ error: "Uploads aren't available right now — please try again in a moment." }, { status: 503 }));
    }
    try {
      for (const file of incomingFiles) {
        const saved = await saveUploadedFile(order.id, file);
        uploaded.push({ id: saved.id, filename: saved.filename, mimeType: saved.mime_type, size: saved.size_bytes });
      }
    } catch (err) {
      const msg = err instanceof AttachmentError ? err.message : "That file couldn't be uploaded.";
      if (!(err instanceof AttachmentError)) console.error("chat attachment save failed", err);
      return withCors(req, NextResponse.json({ error: msg }, { status: 400 }));
    }
  }

  const now = new Date().toISOString();
  const baseConversation = order?.conversation ?? browserHistory.map((t) => ({ ...t, at: now }));
  const userConversation = [...baseConversation, {
    role: "user" as const, content: message, at: now,
    ...(uploaded.length ? { attachments: uploaded } : {}),
  }];

  // Persist the owner message before any model work so Control never loses it.
  if (order && persistenceAvailable) {
    try {
      await sql`UPDATE orders SET conversation=${jsonb(userConversation)} WHERE id=${order.id}`;
    } catch (err) {
      persistenceAvailable = false;
      console.error("chat immediate user-message save failed", err);
    }
  }

  // A first-turn greeting is deterministic and should feel instant.
  if (GREETING_RE.test(message) && userConversation.length <= 2) {
    const reply = "Hi! I'm Sarah. What's the name of your business? If you don't have a name yet, just tell me that.";
    const conversation = [...userConversation, { role: "assistant" as const, content: reply, at: new Date().toISOString(), step: "name" as Step }];
    if (order && persistenceAvailable) {
      try { await sql`UPDATE orders SET conversation=${jsonb(conversation)} WHERE id=${order.id}`; }
      catch (err) { console.error("chat greeting save failed", err); }
    }
    return withCors(req, NextResponse.json({ orderId: order?.id ?? null, reply, quickReplies: [], missing: REQUIRED.map(String).concat("anythingElse"), readyToBuild: false, temporary: !persistenceAvailable }));
  }

  // Customer-visible latency is now ONLY Sarah's reply. Everything that powers
  // CRM/qualification runs after the HTTP response has been sent.
  // Sarah has no vision — attachments are named for her so she can
  // acknowledge them, not analysed as images.
  const turns: Turn[] = userConversation.map((t, i) => ({
    role: t.role,
    content: i === userConversation.length - 1 && uploaded.length
      ? `${t.content}\n\n[Customer attached ${uploaded.length} file(s): ${uploaded.map((f) => f.filename).join(", ")}]`.trim()
      : t.content,
  }));
  const priorBrief = order?.brief ? order.brief as Brief : null;
  const priorTurns = baseConversation as FlowTurn[];
  const prevStep = lastAssistantStep(priorTurns);
  const facts = conversationFacts(turns);
  let finished = false;
  if (prevStep === "confirm") {
    const lastAsked = [...priorTurns].reverse().find((t) => t.role === "assistant");
    finished = quickFinished(message, lastAsked?.options) ?? await classifyFinished(message);
  }
  const confirms = confirmCount(priorTurns);
  const step = decideStep({ prev: prevStep, facts, finished, confirms, latest: message });
  const systemPrompt = sarahSystemPrompt({
    step,
    confirms,
    facts,
    brief: priorBrief && { businessName: priorBrief.businessName, trade: priorBrief.trade, location: priorBrief.location, websiteGoal: priorBrief.websiteGoal, phone: priorBrief.phone },
  });
  let modelReply: string;
  try { modelReply = await chat(systemPrompt, turns, MODELS.sarah); }
  catch (err) {
    await safeLog(order?.id ?? null, "error", { step: "sarah", message: (err as Error).message });
    return withCors(req, NextResponse.json({ orderId: order?.id ?? null, reply: "Sorry — I couldn't get a reply through just now. Please try that message once more.", quickReplies: [], missing: [], readyToBuild: false, retryable: true, temporary: !persistenceAvailable }));
  }

  const parsed = parseSarahReply(modelReply);
  if (!STEPS_WITH_BUTTONS.includes(step)) parsed.quickReplies = [];
  if (!parsed.reply) {
    await safeLog(order?.id ?? null, "error", { step: "sarah", message: "Model reply was empty after marker stripping." });
    return withCors(req, NextResponse.json({ orderId: order?.id ?? null, reply: "Sorry — I couldn't get a reply through just now. Please try that message once more.", quickReplies: [], missing: [], readyToBuild: false, retryable: true, temporary: !persistenceAvailable }));
  }
  const conversation = [...userConversation, {
    role: "assistant" as const, content: parsed.reply, at: new Date().toISOString(), step,
    ...(parsed.quickReplies.length ? { options: parsed.quickReplies.map((q) => q.label) } : {}),
  }];

  // Save Sarah's visible answer quickly; do not make the browser wait for extraction.
  if (order && persistenceAvailable) {
    try { await sql`UPDATE orders SET conversation=${jsonb(conversation)} WHERE id=${order.id}`; }
    catch (err) { persistenceAvailable = false; console.error("chat assistant-message save failed", err); }
  }

  const previousBrief = order?.brief ? order.brief as Brief : null;
  const previousMissing = missingFromBrief(previousBrief);
  // Sarah now asks for email early (right after the business name), so "the
  // user's message contains an email" no longer means the conversation is
  // over — it used to, back when email was the last question. The real
  // signal is the flow reaching its closing step (sarah-flow.ts), which
  // only happens once she has actually stopped asking questions. Detect that
  // instead, so the customer sees the completion UI only when the
  // conversation is genuinely finished, not right after giving their email.
  const readyFast = !!order && persistenceAvailable && step === "close";
  const capturedIp = clientIp(req);
  const orderId = order?.id ?? null;
  const previousOrder = order;
  const trackingConsent = body.trackingConsent;

  if (orderId && previousOrder) {
    after(async () => {
      let brief: Brief | null = null;
      try {
        const transcript = conversation.map((t) => `${t.role === "user" ? "OWNER" : "SARAH"}: ${t.content}`).join("\n\n");
        brief = await json<Brief>(extractionPrompt(), transcript, MODELS.extract, 2500, "minimal");
      } catch (err) {
        await safeLog(orderId, "error", { step: "extract", message: (err as Error).message });
        brief = previousBrief;
      }

      if (brief) {
        if (attribution) brief.attribution = attribution;
        if (typeof trackingConsent === "boolean") brief.trackingConsent = trackingConsent;
      }

      try {
        await sql`UPDATE orders SET conversation=${jsonb(conversation)}, brief=${brief ? jsonb(brief) : previousOrder.brief ? jsonb(previousOrder.brief) : null}, business_name=${brief?.businessName ?? previousOrder.business_name}, trade=${brief?.trade ?? previousOrder.trade}, location=${brief?.location ?? previousOrder.location}, email=${brief?.email ?? previousOrder.email}, phone=${brief?.phone ?? previousOrder.phone} WHERE id=${orderId}`;
        const fresh = await getOrder(orderId);
        if (!fresh) return;

        if (!previousOrder.email && fresh.email) {
          try {
            const confirmation = emailCapturedCopy();
            const messageId = await sendCustomEmail(fresh.email, confirmation.subject, confirmation.body);
            await safeLog(orderId, "email", { message: `Confirmation email sent to ${fresh.email}`, template: "email_captured", messageId });
          } catch (err) {
            await safeLog(orderId, "error", { step: "email_captured_confirmation", message: (err as Error).message });
          }
        }

        const qualification = await syncQualification(fresh);
        if (qualification === "needs_customer") await sql`UPDATE orders SET workflow_stage='needs_customer' WHERE id=${orderId}`;
        await scheduleLeadFollowups(orderId);

        const finalBrief = (fresh.brief ?? brief) as Brief | null;
        const missing = missingFromBrief(finalBrief);
        // readyFast (see above) is the deterministic signal that Sarah has
        // actually reached her closing step — not just that the
        // brief LOOKS complete. Requiring both matters now that step 3 of
        // sarah.ts's flow (sarah.ts) asks about phone/WhatsApp AFTER
        // "anything else" is closed but BEFORE that closing line: without this,
        // the brief already reads as ready once the owner says "that's all",
        // and the order would flip out of "collecting" a turn too early —
        // right as Sarah asks for their phone number — which would make the
        // next customer message (their phone number) hit the canned
        // "we've got enough" deflection below (line ~114) instead of reaching
        // Sarah at all.
        const ready = missing.length === 0 && finalBrief?.readyToBuild === true && readyFast;
        if (!ready) return;

        await setState(orderId, "ready", { source: "customer_brief_complete" });
        await sql`UPDATE orders SET qualification='lead', workflow_stage='new' WHERE id=${orderId}`;
        await sql`UPDATE followups SET status='cancelled' WHERE order_id=${orderId} AND status='pending'`;
        await safeLog(orderId, "lead_ready", { message: `${finalBrief?.businessName || finalBrief?.trade || "Lead"} is ready to queue` });

        if (finalBrief?.trackingConsent === true) {
          const meta = await sendMetaConversion({ eventName: "Lead", eventId: `lead_${orderId}`, email: finalBrief.email, attribution: finalBrief.attribution, clientIp: capturedIp, eventSourceUrl: typeof finalBrief.attribution?.landing_url === "string" ? finalBrief.attribution.landing_url : "https://web99.ie/start/", value: 99, currency: "EUR" });
          await safeLog(orderId, meta.ok ? "meta_conversion" : "meta_conversion_error", { event: "Lead", eventId: `lead_${orderId}`, pixelId: meta.pixelId ?? null, error: meta.error ?? null });
        }
      } catch (err) {
        console.error("chat after-response processing failed", err);
        await safeLog(orderId, "error", { step: "after_response", message: (err as Error).message });
      }
    });
  }

  return withCors(req, NextResponse.json({
    orderId,
    reply: parsed.reply,
    quickReplies: readyFast ? [] : parsed.quickReplies,
    missing: readyFast ? [] : previousMissing,
    readyToBuild: readyFast,
    temporary: !persistenceAvailable,
  }));
}
