import Link from "next/link";
import { listOrders, stateCounts, type Order } from "@/lib/db";

export const dynamic = "force-dynamic";

/* The queue. Ordered so the things needing a human are impossible to miss:
   anything in `review` is somebody's website waiting on a click. */

const ORDER: Record<string, number> = {
  review: 0,
  failed: 1,
  live: 2,
  ready: 3,
  analysing: 4,
  generating: 5,
  sent: 6,
  collecting: 7,
  won: 8,
  lost: 9,
};

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function Queue() {
  let orders: Order[];
  let counts: Record<string, number>;

  try {
    [orders, counts] = await Promise.all([listOrders(), stateCounts()]);
  } catch (err) {
    /* The most common way anyone hits this: first deployment, before
       /api/setup has ever been run, so the `orders` table doesn't exist
       yet. A raw stack trace tells an operator nothing — this tells them
       the two things actually worth checking. */
    return (
      <main className="wrap">
        <h1>Orders</h1>
        <div className="warn" style={{ background: "#fdeceb", borderColor: "#f5c6c2" }}>
          <strong>Can't reach the database.</strong>
          <p style={{ margin: "8px 0 0" }}>
            If this is a brand new deployment, the tables probably haven't
            been created yet — visit{" "}
            <a href="/api/setup" style={{ fontWeight: 700 }}>
              /api/setup
            </a>{" "}
            first.
          </p>
          <p style={{ margin: "8px 0 0" }}>
            If that doesn't fix it, check <code>DATABASE_URL</code> is set
            correctly in Vercel for this project and redeploy.
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 13 }} className="muted">
            What the database actually said: {(err as Error).message}
          </p>
        </div>
      </main>
    );
  }

  const sorted = [...orders].sort(
    (a, b) => (ORDER[a.state] ?? 99) - (ORDER[b.state] ?? 99)
  );

  const waiting = counts.review ?? 0;

  return (
    <main className="wrap">
      <h1>Orders</h1>
      <p className="sub">
        {waiting > 0
          ? `${waiting} ${waiting === 1 ? "site is" : "sites are"} built and waiting for you to look.`
          : "Nothing waiting on you."}
      </p>

      <div className="grid" style={{ marginBottom: 26 }}>
        <Stat n={counts.review ?? 0} label="Needs review" />
        <Stat n={counts.sent ?? 0} label="Sent, deciding" />
        <Stat n={counts.won ?? 0} label="Paid" />
        <Stat n={counts.failed ?? 0} label="Failed" />
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No orders yet. They appear here the moment somebody starts talking to Sarah.
          </p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Trade</th>
              <th>Where</th>
              <th>State</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <Row key={o.id} order={o} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <b>{n}</b>
      <span>{label}</span>
    </div>
  );
}

function Row({ order }: { order: Order }) {
  return (
    <tr>
      <td>
        <Link href={`/orders/${order.id}`} style={{ fontWeight: 600 }}>
          {order.business_name ?? <span className="muted">Still talking…</span>}
        </Link>
      </td>
      <td className="muted">{order.trade ?? "—"}</td>
      <td className="muted">{order.location ?? "—"}</td>
      <td>
        <span className={`pill s-${order.state}`}>{order.state}</span>
      </td>
      <td className="muted">{ago(order.created_at)}</td>
    </tr>
  );
}
