import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookVerificationError } from "svix";
import { findOrderIdByEmail, insertEmail, resolveThreadId } from "@/lib/db";
import { getReceivedEmail, listReceivedEmailAttachments } from "@/lib/email";
import { saveEmailAttachment } from "@/lib/attachments";

export const runtime = "nodejs";

/* ===========================================================================
   INBOUND EMAIL WEBHOOK
   ---------------------------------------------------------------------------
   Resend signs webhook requests the same way Svix does (svix-id/timestamp/
   signature headers, HMAC over "{id}.{timestamp}.{raw body}"). This route is
   listed in middleware.ts's PUBLIC paths — it can't use the operator cookie,
   since Resend is the caller — and authenticates the request via that
   signature instead, the same pattern as /api/stripe.

   The webhook payload itself only carries metadata (from/to/subject/
   message_id); the body and the In-Reply-To/References headers needed for
   threading require a follow-up call to Resend's receiving API, done here
   via getReceivedEmail().
   =========================================================================== */

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not set — rejecting inbound webhook.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: any;
  try {
    event = new Webhook(secret).verify(raw, headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    throw err;
  }

  if (event?.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event?.type ?? "unknown" });
  }

  const emailId = event.data?.email_id as string | undefined;
  if (!emailId) return NextResponse.json({ error: "Missing email_id" }, { status: 400 });

  try {
    const full = await getReceivedEmail(emailId);
    const lowerHeaders = Object.fromEntries(
      Object.entries(full.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
    );
    const inReplyTo = lowerHeaders["in-reply-to"]?.trim() || null;
    const refs = lowerHeaders["references"]?.trim() || null;
    const toAddress = Array.isArray(full.to) ? full.to[0] ?? "" : String(full.to ?? "");

    const [orderId, threadId] = await Promise.all([
      findOrderIdByEmail(full.from),
      resolveThreadId(inReplyTo, refs),
    ]);

    const inserted = await insertEmail({
      order_id: orderId,
      direction: "inbound",
      from_email: full.from,
      to_email: toAddress,
      subject: full.subject ?? "",
      html: full.html ?? null,
      text_body: full.text ?? null,
      message_id: full.message_id,
      in_reply_to: inReplyTo,
      refs,
      thread_id: threadId,
      resend_id: full.id ?? emailId,
    });

    // inserted is null when this message_id was already stored (Resend's
    // at-least-once delivery) — skip attachments too, or a redelivery would
    // save duplicate files under a new (unused) row every time.
    if (inserted) {
      try {
        const attachments = await listReceivedEmailAttachments(emailId);
        for (const att of attachments) {
          const fileRes = await fetch(att.download_url);
          if (!fileRes.ok) {
            console.error(`resend webhook: attachment download failed (${att.filename}): ${fileRes.status}`);
            continue;
          }
          const buffer = Buffer.from(await fileRes.arrayBuffer());
          await saveEmailAttachment(inserted.id, att.filename, att.content_type, buffer);
        }
      } catch (err) {
        // The email itself is safely stored either way — don't fail the
        // whole webhook (and trigger a Resend retry-storm) over attachments.
        console.error("resend webhook: failed to process attachments", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resend webhook: failed to process email.received", err);
    // 200 so Resend doesn't retry-storm on a bug on our end; the error is logged.
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}
