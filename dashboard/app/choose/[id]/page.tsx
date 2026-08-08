import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { commercials } from "@/lib/capabilities";
import { resolveMetaPixelId } from "@/lib/meta-sales";
import Choice from "./choice";
import PurchaseAnalytics from "./PurchaseAnalytics";

export const dynamic = "force-dynamic";

export default async function ChoosePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;
  const order = await getOrder(id);
  if (!order) notFound();

  const name = order.business_name ?? "your business";
  const brief = (order.brief || {}) as { trackingConsent?: boolean };
  const shouldTrackPurchase = paid === "1" && order.state === "won" && brief.trackingConsent === true;
  let metaPixelId: string | null = null;
  if (shouldTrackPurchase) {
    try {
      metaPixelId = await resolveMetaPixelId(false);
    } catch (error) {
      console.error("purchase page pixel lookup failed", error);
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      {shouldTrackPurchase && order.stripe_session_id && (
        <PurchaseAnalytics
          transactionId={order.stripe_session_id}
          value={commercials.priceNumeric / 100}
          pixelId={metaPixelId}
        />
      )}

      {paid === "1" && (
        <div
          className="card"
          style={{ background: "#d9f2e6", borderColor: "#a8ddc4" }}
        >
          <h1 style={{ fontSize: 22, margin: 0 }}>Payment received. {name} is online.</h1>
          <p style={{ margin: "8px 0 0" }}>
            A receipt is on its way to your email. Your domain is being registered in
            your name now.
          </p>
        </div>
      )}

      <h1 style={{ marginTop: 28 }}>One thing to decide.</h1>
      <p className="sub">
        Your website is yours either way — the domain is in your name and the files
        belong to you. This is just about who looks after it.
      </p>

      {order.retention ? (
        <div className="card">
          <p style={{ margin: 0 }}>
            {order.retention === "stayed"
              ? "Grand — we'll keep looking after it. Nothing else to do."
              : "No bother. We'll be in touch about moving everything across to you."}
          </p>
        </div>
      ) : (
        <Choice id={id} renewal={commercials.renewal} freeChanges={commercials.freeChanges} />
      )}

      <p className="muted" style={{ fontSize: 13, marginTop: 24 }}>
        Either way you keep your {commercials.freeChanges} free changes, and either way
        we help you move it if you ever want to. We don't charge for that.
      </p>
    </main>
  );
}
