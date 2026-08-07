import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getOrder, sql, logEvent } from "@/lib/db";
import { commercials } from "@/lib/capabilities";

export const runtime = "nodejs";

/* GET /buy/:id
   The target of every "Yes, I'll take it" button on a preview site.

   Creates a Checkout Session tied to this specific order and redirects. Doing
   it per-order rather than using one shared payment link means the webhook
   knows exactly whose site was just bought, with no matching by email or
   guesswork. */

let _stripe: Stripe | undefined;
function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set. See .env.example.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    return NextResponse.redirect(`${process.env.MARKETING_URL ?? "https://web99.ie"}/`);
  }

  if (order.state === "won") {
    return NextResponse.redirect(`${process.env.APP_URL}/choose/${id}`);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: commercials.currency.toLowerCase(),
          unit_amount: commercials.priceNumeric,
          product_data: {
            name: `Website for ${order.business_name ?? "your business"}`,
            description:
              "Complete website, domain and hosting for the first year, business email, and a Facebook page with three months of posts.",
          },
        },
        quantity: 1,
      },
    ],
    customer_email: order.email ?? undefined,
    client_reference_id: id,
    metadata: { orderId: id, slug: order.slug ?? "" },
    success_url: `${process.env.APP_URL}/choose/${id}?paid=1`,
    cancel_url: order.preview_url ?? `${process.env.MARKETING_URL}/`,
    invoice_creation: { enabled: true },
  });

  await sql`UPDATE orders SET stripe_session_id = ${session.id} WHERE id = ${id}`;
  await logEvent(id, "state_change", { step: "checkout_started", session: session.id });

  return NextResponse.redirect(session.url!, { status: 303 });
}
