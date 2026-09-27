import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth";
import { getEmail, getOrder, insertEmail, listEmailAttachmentsForThread, listEmailsInThread, listThreadsForOrder, logEvent, markThreadRead } from "@/lib/db";
import { sendThreaded } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "No such lead/project" }, { status: 404 });

  const threadId = req.nextUrl.searchParams.get("thread");
  if (threadId) {
    const emails = await listEmailsInThread(id, threadId);
    const attachments = await listEmailAttachmentsForThread(emails.map((e) => e.id));
    await markThreadRead(id, threadId);
    return NextResponse.json({
      emails: emails.map((e) => ({
        ...e,
        attachments: attachments.filter((a) => a.email_id === e.id),
      })),
    });
  }

  const threads = await listThreadsForOrder(id);
  return NextResponse.json({ threads });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "No such lead/project" }, { status: 404 });

  const body = (await req.json()) as Record<string, any>;
  const action = String(body.action ?? "");

  try {
    switch (action) {
      case "reply": {
        const replyToId = Number(body.emailId);
        const original = replyToId ? await getEmail(replyToId) : null;
        if (!original || original.order_id !== id) throw new Error("That email no longer exists.");

        const text = String(body.body ?? "").trim();
        if (!text) throw new Error("Write a reply first.");

        let subject = original.subject || "";
        if (!/^re:/i.test(subject.trim())) subject = `Re: ${subject}`;

        const to = original.direction === "inbound" ? original.from_email : original.to_email;

        const { resendId, messageId } = await sendThreaded({
          to,
          subject,
          bodyText: text,
          inReplyTo: original.message_id,
          references: original.refs,
        });

        await insertEmail({
          order_id: id,
          direction: "outbound",
          from_email: process.env.EMAIL_FROM ?? "Web99 <hello@web99.ie>",
          to_email: to,
          subject,
          html: null,
          text_body: text,
          message_id: messageId,
          in_reply_to: original.message_id,
          refs: [original.refs, original.message_id].filter(Boolean).join(" "),
          thread_id: original.thread_id,
          resend_id: resendId,
        });

        await logEvent(id, "email", { message: `Replied to ${to}`, to, subject, messageId });
        return NextResponse.json({ ok: true });
      }

      case "markRead": {
        const threadId = String(body.threadId ?? "");
        if (!threadId) throw new Error("Missing threadId.");
        await markThreadRead(id, threadId);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
