import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth";
import { getOrder, logEvent } from "@/lib/db";
import { onTheWay, siteReady, nudge, paid, send } from "@/lib/email";
import { sendCustomEmail } from "@/lib/custom-email";

export const runtime = "nodejs";

/* ===========================================================================
   Ad-hoc email from the dashboard's Email tab. Separate from the automated
   sends the pipeline itself triggers (sendPreview on /orders/[id], the
   per-lead follow-up on the Leads tab) — this is for typing an address in by
   hand, or re-sending one of the branded templates to an order outside the
   pipeline's normal flow. It never changes an order's state; it only sends
   and, if the email is tied to an order, logs an event on it.
   =========================================================================== */

export async function POST(req: NextRequest) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  const body = (await req.json()) as Record<string, any>;
  const to = String(body.to ?? "").trim();
  const template = String(body.template ?? "custom");
  const orderId = body.orderId ? String(body.orderId) : null;

  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const businessName = String(body.businessName ?? "").trim() || "your business";

  try {
    let subject: string;
    let messageId: string;

    switch (template) {
      case "onTheWay": {
        const email = onTheWay(name, businessName);
        messageId = await send(to, email);
        subject = email.subject;
        break;
      }
      case "siteReady": {
        const previewUrl = String(body.previewUrl ?? "").trim();
        if (!previewUrl) throw new Error("This template needs a preview URL.");
        const email = siteReady(name, businessName, previewUrl);
        messageId = await send(to, email);
        subject = email.subject;
        break;
      }
      case "nudge": {
        const previewUrl = String(body.previewUrl ?? "").trim();
        if (!previewUrl) throw new Error("This template needs a preview URL.");
        const email = nudge(name, businessName, previewUrl);
        messageId = await send(to, email);
        subject = email.subject;
        break;
      }
      case "paid": {
        const liveUrl = String(body.liveUrl ?? "").trim();
        const chooseUrl = String(body.chooseUrl ?? "").trim();
        if (!liveUrl || !chooseUrl) throw new Error("This template needs both the live site URL and the choose-us link.");
        const email = paid(name, businessName, liveUrl, chooseUrl);
        messageId = await send(to, email);
        subject = email.subject;
        break;
      }
      case "custom": {
        subject = String(body.subject ?? "").trim();
        const message = String(body.message ?? "").trim();
        if (!subject || !message) throw new Error("Subject and message are required.");
        messageId = await sendCustomEmail(to, subject, message);
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown template "${template}".` }, { status: 400 });
    }

    if (orderId) {
      const order = await getOrder(orderId);
      if (order) {
        await logEvent(orderId, "email", { message: `Email sent to ${to}`, template, subject, messageId, to });
      }
    }

    return NextResponse.json({ ok: true, messageId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
