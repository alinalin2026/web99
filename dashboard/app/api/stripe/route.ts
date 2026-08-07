import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sql, getOrder, setState, logEvent } from "@/lib/db";
import { paid, send } from "@/lib/email";

export const runtime = "nodejs";

/* Stripe webhook. The only thing that may mark an order paid — never the
   success_url, which a customer can reach by typing it. */

/* No apiVersion pin — the SDK's own default always matches the types it
   ships with, so upgrading the package can't leave a stale literal behind.
   Constructed lazily so a build doesn't need live keys. */
let _stripe: Stripe | undefined;
function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set. See .env.example.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId ?? session.client_reference_id;

    if (orderId) {
      const order = await getOrder(orderId);
      if (order && order.state !== "won") {
        await sql`
          UPDATE orders SET
            paid_at = now(),
            stripe_payment_intent = ${(session.payment_intent as string) ?? null}
          WHERE id = ${orderId}`;
        await setState(orderId, "won", { session: session.id });
        await logEvent(orderId, "state_change", { step: "paid", amount: session.amount_total });

        if (order.email) {
          try {
            await send(
              order.email,
              paid(
                "",
                order.business_name ?? "your business",
                order.preview_url ?? "",
                `${process.env.APP_URL}/choose/${orderId}`
              )
            );
            await logEvent(orderId, "email", { template: "paid", to: order.email });
          } catch (err) {
            await logEvent(orderId, "error", { step: "email", message: (err as Error).message });
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
