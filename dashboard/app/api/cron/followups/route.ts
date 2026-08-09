import { NextRequest, NextResponse } from "next/server";
import { sendCustomEmail } from "@/lib/custom-email";
import { ensureMasterSchema, logEvent, sql } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  return {
    subject: "Last follow-up from Web99",
    body: `Hi,\n\nOne last message about the website${business}. If you'd still like us to make the first version, reply whenever it suits you. If not, no worries — we won't keep chasing you.\n\nAlan\nWeb99.ie`,
  };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  await ensureMasterSchema();

  const due = await sql<{
    id: number; order_id: string; kind: string; email: string; business_name: string | null;
    state: string; workflow_stage: string; followup_enabled: boolean;
  }[]>`
    SELECT f.id, f.order_id, f.kind, o.email, o.business_name, o.state::text, o.workflow_stage, o.followup_enabled
    FROM followups f JOIN orders o ON o.id = f.order_id
    WHERE f.status = 'pending' AND f.due_at <= now() AND o.email IS NOT NULL
    ORDER BY f.due_at ASC LIMIT 50`;

  const results: { id: number; ok: boolean; skipped?: string; error?: string }[] = [];
  for (const row of due) {
    if (!row.followup_enabled || row.state !== "collecting" || !["new", "needs_customer"].includes(row.workflow_stage)) {
      await sql`UPDATE followups SET status = 'cancelled' WHERE id = ${row.id}`;
      results.push({ id: row.id, ok: true, skipped: "project moved on" });
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
