import { NextRequest, NextResponse } from "next/server";
import { sendCustomEmail } from "@/lib/custom-email";
import { ensureMasterSchema, logEvent, sql } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

// Kinds fall into two families, scheduled from two different moments and
// cancelled by two different conditions — see the validity check in GET().
const PREVIEW_KINDS = new Set(["preview_24h", "preview_36h", "preview_48h"]);

function copy(kind: string, businessName: string | null) {
  const business = businessName ? ` for ${businessName}` : "";
  if (kind === "30m") return {
    subject: "Your Web99 website chat",
    body: `Hi,\n\nYou were chatting with Sarah about a website${business}. If you got interrupted, no problem — just reply here with anything you still wanted us to know and we can pick it up from there.\n\nAlan\nWeb99.ie`,
  };
  if (kind === "24h") return {
    subject: "Still want us to put the website together?",
    body: `Hi,\n\nJust following up on your website chat${business}. We may already have enough to make a first demo. If you'd like us to continue, just reply yes — or send any missing logo/photos/details in this email.\n\nAlan\nWeb99.ie`,
  };
  if (kind === "3d") return {
    subject: "Last follow-up from Web99",
    body: `Hi,\n\nOne last message about the website${business}. If you'd still like us to make the first version, reply whenever it suits you. If not, no worries — we won't keep chasing you.\n\nAlan\nWeb99.ie`,
  };
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
    state: string; workflow_stage: string; followup_enabled: boolean; has_reply: boolean;
  }[]>`
    SELECT f.id, f.order_id, f.kind, o.email, o.business_name, o.state::text, o.workflow_stage, o.followup_enabled,
      EXISTS (
        SELECT 1 FROM emails e WHERE e.order_id = f.order_id AND e.direction = 'inbound'
          AND (o.sent_at IS NULL OR e.created_at >= o.sent_at)
      ) AS has_reply
    FROM followups f JOIN orders o ON o.id = f.order_id
    WHERE f.status = 'pending' AND f.due_at <= now() AND o.email IS NOT NULL
    ORDER BY f.due_at ASC LIMIT 50`;

  const results: { id: number; ok: boolean; skipped?: string; error?: string }[] = [];
  for (const row of due) {
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
