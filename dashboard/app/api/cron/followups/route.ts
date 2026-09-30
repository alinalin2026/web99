import { NextRequest, NextResponse } from "next/server";
import { sendCustomEmail } from "@/lib/custom-email";
import { ensureMasterSchema, logEvent, sql } from "@/lib/db";
import { siteFollowup, send } from "@/lib/email";
import { ACTIVE_WINDOW_HOURS, LEGACY_LEAD_KINDS, SITE_SRC, decideSiteFollowup, isSiteKind } from "@/lib/followups";
import { unsubscribeUrlFor } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const maxDuration = 60;

// Kinds fall into three families: site nudges (site_24h/site_3d, scheduled from when the site was built),
// post-preview nudges for previews an operator sent by hand (preview_*), and the retired 30m/24h/3d lead
// sequence. Each is scheduled from a different moment and cancelled by different conditions — see GET().
const PREVIEW_KINDS = new Set(["preview_24h", "preview_36h", "preview_48h"]);

function copy(kind: string, businessName: string | null) {
  const business = businessName ? ` for ${businessName}` : "";
  // Post-preview sequence: same "collecting" lead nurture idea, applied to the
  // other side of the funnel — a lead who has actually SEEN the preview and
  // gone quiet, rather than one who never finished the chat.
  if (kind === "preview_24h") return {
    subject: "Did you get to see your preview?",
    body: `Hi,\n\nJust checking you saw the preview we sent over${business}. Have a look whenever suits — no pressure, and no card needed to take it further.\n\nIf anything's not quite right, just reply and let us know.\n\nAlan\nWeb99.ie`,
  };
  if (kind === "preview_36h") return {
    subject: "Still time to look at your preview",
    body: `Hi,\n\nFollowing up again on the preview${business}. It's still up and ready to look at whenever suits you.\n\nIf you've decided it's not for you, no worries at all — just let us know and we'll leave it there.\n\nAlan\nWeb99.ie`,
  };
  return {
    subject: "Your preview comes down today",
    body: `Hi,\n\nLast note from us — your preview${business} comes down today, 48 hours after we sent it over.\n\nIf you'd like to keep it, there's a button on the page to take it. No rush if now isn't the time — we just wanted you to know before it's gone.\n\nAlan\nWeb99.ie`,
  };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  await ensureMasterSchema();

  const due = await sql<{
    id: number; order_id: string; kind: string; email: string; business_name: string | null;
    state: string; workflow_stage: string; followup_enabled: boolean; has_reply: boolean; due_at: string;
    paid: boolean; wants_it: boolean; recently_active: boolean; site_reply: boolean;
  }[]>`
    SELECT f.id, f.order_id, f.kind, f.due_at, o.email, o.business_name, o.state::text, o.workflow_stage, o.followup_enabled,
      EXISTS (
        SELECT 1 FROM emails e WHERE e.order_id = f.order_id AND e.direction = 'inbound'
          AND (o.sent_at IS NULL OR e.created_at >= o.sent_at)
      ) AS has_reply,
      EXISTS (
        SELECT 1 FROM emails e WHERE e.order_id = f.order_id AND e.direction = 'inbound'
          AND e.created_at >= (SELECT min(v.created_at) FROM order_events v WHERE v.order_id = f.order_id AND v.kind = 'instant_site')
      ) AS site_reply,
      (o.paid_at IS NOT NULL) AS paid,
      EXISTS (SELECT 1 FROM order_events v WHERE v.order_id = f.order_id AND v.kind = 'wants_it') AS wants_it,
      EXISTS (SELECT 1 FROM order_events v WHERE v.order_id = f.order_id AND v.kind IN ('workspace_opened', 'preview_chat')
        AND v.created_at > now() - (${ACTIVE_WINDOW_HOURS} * interval '1 hour')) AS recently_active
    FROM followups f JOIN orders o ON o.id = f.order_id
    WHERE f.status = 'pending' AND f.due_at <= now()
    ORDER BY f.due_at ASC LIMIT 50`;

  const results: { id: number; ok: boolean; skipped?: string; error?: string }[] = [];
  for (const row of due) {
    if (LEGACY_LEAD_KINDS.has(row.kind)) {
      await sql`UPDATE followups SET status = 'cancelled' WHERE id = ${row.id}`;
      results.push({ id: row.id, ok: true, skipped: "retired sequence" });
      continue;
    }

    if (isSiteKind(row.kind)) {
      const decision = decideSiteFollowup({
        kind: row.kind, dueAt: row.due_at, email: row.email, followupEnabled: row.followup_enabled, state: row.state,
        paid: row.paid, hasReply: row.site_reply, recentlyActive: row.recently_active,
      });
      if (decision.action === "cancel") {
        await sql`UPDATE followups SET status = 'cancelled' WHERE id = ${row.id}`;
        results.push({ id: row.id, ok: true, skipped: decision.reason });
        continue;
      }
      if (decision.action === "wait") { results.push({ id: row.id, ok: true, skipped: `waiting: ${decision.reason}` }); continue; }
      try {
        const base = (process.env.APP_URL ?? "https://web99.ie").replace(/\/+$/, "");
        const unsubscribeUrl = unsubscribeUrlFor(row.order_id);
        const email = siteFollowup(row.kind, {
          businessName: row.business_name ?? "",
          siteUrl: `${base}/start/?site=${row.order_id}&src=${SITE_SRC[row.kind]}`,
          unsubscribeUrl,
          wantsIt: row.wants_it,
        });
        // Claim the row before sending so two overlapping runs can never send the same nudge twice.
        const claimed = await sql`UPDATE followups SET status = 'sending' WHERE id = ${row.id} AND status = 'pending' RETURNING id`;
        if (!claimed.length) { results.push({ id: row.id, ok: true, skipped: "already claimed" }); continue; }
        try {
          const messageId = await send(row.email, email, row.order_id, {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          });
          await sql`UPDATE followups SET status = 'sent', subject = ${email.subject}, body = ${email.text}, sent_at = now() WHERE id = ${row.id}`;
          await logEvent(row.order_id, "followup_sent", { message: `${row.kind} follow-up sent`, kind: row.kind, to: row.email, messageId });
          results.push({ id: row.id, ok: true });
        } catch (err) {
          await sql`UPDATE followups SET status = 'failed' WHERE id = ${row.id}`;
          throw err;
        }
      } catch (err) {
        const message = (err as Error).message;
        await logEvent(row.order_id, "error", { step: "followup", kind: row.kind, message });
        results.push({ id: row.id, ok: false, error: message });
      }
      continue;
    }

    if (!row.email) { await sql`UPDATE followups SET status = 'cancelled' WHERE id = ${row.id}`; continue; }
    const isPreviewFollowup = PREVIEW_KINDS.has(row.kind);
    // Pre-preview: only valid while the lead is still mid-chat and hasn't
    // moved on. Post-preview: only valid while the lead is still waiting on
    // the preview we sent them — cancel if they replied, paid (won), or the
    // project was otherwise closed out (lost/failed).
    const stillValid = isPreviewFollowup
      ? row.followup_enabled && row.state === "sent" && !row.has_reply
      : row.followup_enabled && row.state === "collecting" && ["new", "needs_customer"].includes(row.workflow_stage);
    if (!stillValid) {
      await sql`UPDATE followups SET status = 'cancelled' WHERE id = ${row.id}`;
      results.push({ id: row.id, ok: true, skipped: isPreviewFollowup ? "preview no longer pending" : "project moved on" });
      continue;
    }
    try {
      const email = copy(row.kind, row.business_name);
      const messageId = await sendCustomEmail(row.email, email.subject, email.body);
      await sql`UPDATE followups SET status = 'sent', subject = ${email.subject}, body = ${email.body}, sent_at = now() WHERE id = ${row.id}`;
      await logEvent(row.order_id, "followup_sent", { message: `${row.kind} lead follow-up sent`, kind: row.kind, to: row.email, messageId });
      results.push({ id: row.id, ok: true });
    } catch (err) {
      const message = (err as Error).message;
      await sql`UPDATE followups SET status = 'failed' WHERE id = ${row.id}`;
      await logEvent(row.order_id, "error", { step: "followup", kind: row.kind, message });
      results.push({ id: row.id, ok: false, error: message });
    }
  }
  return NextResponse.json({ checked: due.length, results });
}
