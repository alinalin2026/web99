import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getOrder, sql, logEvent } from "@/lib/db";
import { commercials } from "@/lib/capabilities";
import { sendMetaConversion } from "@/lib/meta-conversions";

export const runtime = "nodejs";

let _stripe: Stripe | undefined;
function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set. See .env.example.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function GET(
  req: NextRequest,
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

  const brief = (order.brief || {}) as {
    trackingConsent?: boolean;
    attribution?: Record<string, string | number> | null;
  };
  if (brief.trackingConsent === true) {
    const meta = await sendMetaConversion({
      eventName: "InitiateCheckout",
      eventId: `checkout_${session.id}`,
      email: order.email,
      attribution: brief.attribution,
      clientIp: clientIp(req),
      eventSourceUrl: order.preview_url || `${process.env.MARKETING_URL ?? "https://web99.ie"}/`,
      value: commercials.priceNumeric / 100,
      currency: commercials.currency,
    });
    await logEvent(id, meta.ok ? "meta_conversion" : "meta_conversion_error", {
      event: "InitiateCheckout",
      eventId: `checkout_${session.id}`,
      pixelId: meta.pixelId ?? null,
      error: meta.error ?? null,
    });
  }

  return NextResponse.redirect(session.url!, { status: 303 });
}
