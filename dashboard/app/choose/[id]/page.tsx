import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { commercials } from "@/lib/capabilities";
import Choice from "./choice";

export const dynamic = "force-dynamic";

/* The stay-or-leave fork, after they've paid.

   Deliberately not a retention funnel. They already own the domain and the
   files — that's promised on the marketing site, in the FAQ and in the terms.
   Making it hard to leave here would poison the exact thing that makes the
   €99 pitch work in the first place.

   So: both options are presented plainly, "leave" is one click and does not
   ask why, and nothing on this page is dressed up as a limited-time anything.
   The care plan is not offered here because it isn't built yet — when it is,
   it goes in capabilities.ts and gets added to the "stay" column. */

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

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
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
