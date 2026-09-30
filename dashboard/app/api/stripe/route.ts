import { NextRequest, NextResponse } from "next/server";
import { sql, getOrder, setState, logEvent } from "@/lib/db";
import { paid, send } from "@/lib/email";
import { sendMetaConversion } from "@/lib/meta-conversions";
import { paidSessionFrom, verifyStripeEvent } from "@/lib/stripe-webhook";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  let event;
  try {
    event = verifyStripeEvent(await req.text(), sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  const paidEvent = paidSessionFrom(event);
  if (paidEvent) {
    const { session, orderId } = paidEvent;
    const order = await getOrder(orderId);
    if (order && order.state !== "won") {
      await sql`
        UPDATE orders SET
          paid_at = now(),
          stripe_payment_intent = ${(session.payment_intent as string) ?? null}
        WHERE id = ${orderId}`;
      await setState(orderId, "won", { session: session.id });
      await sql`UPDATE followups SET status = 'cancelled' WHERE order_id = ${orderId} AND status = 'pending'`;
      await logEvent(orderId, "state_change", { step: "paid", amount: session.amount_total });

      const brief = (order.brief || {}) as {
        trackingConsent?: boolean;
        attribution?: Record<string, string | number> | null;
      };
      if (brief.trackingConsent === true) {
        const meta = await sendMetaConversion({
          eventName: "Purchase",
          eventId: `purchase_${session.id}`,
          email: order.email,
          attribution: brief.attribution,
          eventSourceUrl: `${process.env.APP_URL}/choose/${orderId}`,
          value: (session.amount_total ?? 9900) / 100,
          currency: (session.currency || "eur").toUpperCase(),
        });
        await logEvent(orderId, meta.ok ? "meta_conversion" : "meta_conversion_error", {
          event: "Purchase",
          eventId: `purchase_${session.id}`,
          pixelId: meta.pixelId ?? null,
          error: meta.error ?? null,
        });
      }

      if (order.email) {
        try {
          await send(
            order.email,
            paid(
              "",
              order.business_name ?? "your business",
              order.preview_url ?? "",
              `${process.env.APP_URL}/choose/${orderId}`
            ),
            orderId
          );
          await logEvent(orderId, "email", { template: "paid", to: order.email });
        } catch (err) {
          await logEvent(orderId, "error", { step: "email", message: (err as Error).message });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
