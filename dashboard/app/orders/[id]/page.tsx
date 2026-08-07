import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, listEvents } from "@/lib/db";
import { validate } from "@/lib/pipeline";
import Actions from "./actions";

export const dynamic = "force-dynamic";

/* The review screen. Everything a person needs to decide whether this website
   is fit to go to a real business, on one page, without scrolling for it:
   what the site looks like, what was claimed, and where those claims came
   from. */

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const events = await listEvents(id);
  const analysis = (order.analysis ?? {}) as any;
  const problems = order.generated ? validate(order.generated) : [];
  const home = order.generated?.["index.html"];

  return (
    <main className="wrap">
      <p style={{ margin: "0 0 14px" }}>
        <Link href="/">← All orders</Link>
      </p>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>{order.business_name ?? "Unnamed order"}</h1>
          <p className="sub">
            {[order.trade, order.location].filter(Boolean).join(" · ") || "Still collecting"}
          </p>
        </div>
        <span className={`pill s-${order.state}`}>{order.state}</span>
      </div>

      {order.state === "failed" && (
        <div className="warn" style={{ background: "#fdeceb", borderColor: "#f5c6c2" }}>
          <strong>This one broke.</strong>
          <p style={{ margin: "6px 0 0" }}>{order.failure_reason}</p>
        </div>
      )}

      {problems.length > 0 && (
        <div className="warn">
          <strong>{problems.length} thing{problems.length === 1 ? "" : "s"} worth checking before this goes out</strong>
          <ul>
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {order.generator_notes && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>What the builder flagged</h2>
          <p style={{ margin: 0 }}>{order.generator_notes}</p>
        </div>
      )}

      <Actions
        id={order.id}
        state={order.state}
        previewUrl={order.preview_url}
        hasEmail={Boolean(order.email)}
      />

      {/* --- the site itself --------------------------------------------- */}
      {home && (
        <>
          <h2>The website</h2>
          <iframe
            title="Generated site preview"
            srcDoc={home}
            sandbox="allow-same-origin"
          />
          <p className="muted" style={{ fontSize: 13 }}>
            Homepage only. {Object.keys(order.generated ?? {}).length} file
            {Object.keys(order.generated ?? {}).length === 1 ? "" : "s"} in total:{" "}
            {Object.keys(order.generated ?? {}).join(", ")}
          </p>
        </>
      )}

      {/* --- what was claimed, and where it came from --------------------- */}
      {analysis.confirmedFacts && (
        <>
          <h2>Facts used (everything here must have come from them)</h2>
          <div className="card">
            <pre>{JSON.stringify(analysis.confirmedFacts, null, 2)}</pre>
          </div>
        </>
      )}

      {Array.isArray(analysis.underSold) && analysis.underSold.length > 0 && (
        <>
          <h2>Things they under-sold</h2>
          <div className="card">
            {analysis.underSold.map((u: any, i: number) => (
              <p key={i} style={{ margin: i ? "12px 0 0" : 0 }}>
                <strong>{u.fact}</strong>
                <br />
                <span className="muted">
                  {u.whereItGoes} — {u.why}
                </span>
              </p>
            ))}
          </div>
        </>
      )}

      {Array.isArray(analysis.judgementCalls) && analysis.judgementCalls.length > 0 && (
        <>
          <h2>Design decisions and why</h2>
          <div className="card">
            {analysis.judgementCalls.map((j: any, i: number) => (
              <p key={i} style={{ margin: i ? "12px 0 0" : 0 }}>
                <strong>{j.decision}</strong>
                <br />
                <span className="muted">{j.reasoning}</span>
              </p>
            ))}
          </div>
        </>
      )}

      {Array.isArray(analysis.questionsForTheOwner) &&
        analysis.questionsForTheOwner.length > 0 && (
          <>
            <h2>Worth asking them</h2>
            <div className="card">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {analysis.questionsForTheOwner.map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </>
        )}

      {/* --- the conversation -------------------------------------------- */}
      <h2>What they told Sarah</h2>
      <div className="card">
        {order.conversation.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Nothing yet.</p>
        ) : (
          order.conversation.map((t, i) => (
            <p key={i} style={{ margin: i ? "12px 0 0" : 0 }}>
              <strong style={{ color: t.role === "user" ? "var(--ink)" : "var(--violet)" }}>
                {t.role === "user" ? "Them" : "Sarah"}
              </strong>
              <br />
              {t.content}
            </p>
          ))
        )}
      </div>

      {/* --- audit trail -------------------------------------------------- */}
      <h2>History</h2>
      <div className="card">
        {events.map((e) => (
          <p key={e.id} style={{ margin: "0 0 6px", fontSize: 13 }}>
            <span className="muted">{new Date(e.created_at).toLocaleString("en-IE")}</span>{" "}
            <strong>{e.kind}</strong>{" "}
            <span className="muted">{JSON.stringify(e.detail).slice(0, 160)}</span>
          </p>
        ))}
      </div>
    </main>
  );
}
