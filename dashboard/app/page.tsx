import Link from "next/link";
import {
  ensureMasterSchema, listOrders, listWorkEvents, qualificationFor, sql, type Order,
} from "@/lib/db";
import { ActionButton, AutopilotSelect, LeadControls } from "./MasterActions";

export const dynamic = "force-dynamic";

type Tab = "work" | "leads" | "queue" | "studio";

function ago(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function name(order: Order) { return order.business_name || order.trade || "Unnamed lead"; }
function internalPreview(order: Order) {
  return order.slug && order.generated ? `/preview/${order.slug}` : null;
}
function stageLabel(stage: string) {
  return ({
    new: "New", queued: "Queued", planning: "Agent planning", plan_ready: "Plan ready",
    creating: "Agent writing", studio_ready: "Studio ready", building: "Building",
    qa: "QA", ready: "Build ready", failed: "Needs attention", complete: "Complete",
  } as Record<string, string>)[stage] ?? stage.replaceAll("_", " ");
}
function stageTone(stage: string) {
  if (stage === "failed") return "red";
  if (["plan_ready", "studio_ready", "ready"].includes(stage)) return "green";
  if (["planning", "creating", "building", "qa", "queued"].includes(stage)) return "blue";
  return "grey";
}

function tabs(active: Tab) {
  return (
    <nav className="top-pills" aria-label="Dashboard sections">
      {(["work", "leads", "queue", "studio"] as Tab[]).map((tab) => (
        <Link key={tab} className={`top-pill ${active === tab ? "active" : ""}`} href={`/?tab=${tab}`}>
          {tab[0].toUpperCase() + tab.slice(1)}
        </Link>
      ))}
    </nav>
  );
}

export default async function MasterDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; group?: string }>;
}) {
  const query = await searchParams;
  const active = (["work", "leads", "queue", "studio"].includes(query.tab ?? "") ? query.tab : "work") as Tab;

  try {
    await ensureMasterSchema();
    const [orders, events, assetRows] = await Promise.all([
      listOrders(),
      listWorkEvents(60),
      sql<{ order_id: string; total: string; ready: string }[]>`
        SELECT order_id, count(*)::text AS total,
          count(*) FILTER (WHERE status = 'ready')::text AS ready
        FROM project_assets GROUP BY order_id`,
    ]);
    const assets = new Map(assetRows.map((r) => [r.order_id, { total: Number(r.total), ready: Number(r.ready) }]));

    return (
      <main className="master-shell">
        <header className="master-header">
          <div>
            <div className="brandline">Web<span>99</span> <b>Control</b></div>
            <p>{active === "work" ? "What needs you right now" : "OpenAI-powered website production"}</p>
          </div>
          <div className="header-dot" title="Dashboard online" />
        </header>
        {tabs(active)}

        {active === "work" && <WorkTab orders={orders} events={events} assets={assets} />}
        {active === "leads" && <LeadsTab orders={orders} group={query.group ?? "all"} />}
        {active === "queue" && <QueueTab orders={orders} />}
        {active === "studio" && <StudioTab orders={orders} assets={assets} />}
      </main>
    );
  } catch (err) {
    return (
      <main className="master-shell">
        <header className="master-header"><div><div className="brandline">Web<span>99</span> <b>Control</b></div><p>Dashboard</p></div></header>
        {tabs(active)}
        <div className="panel error-panel">
          <strong>Dashboard database is not reachable.</strong>
          <p>{(err as Error).message}</p>
          <Link className="btn" href="/api/setup">Run database setup</Link>
        </div>
      </main>
    );
  }
}

function WorkTab({
  orders, events, assets,
}: {
  orders: Order[];
  events: Awaited<ReturnType<typeof listWorkEvents>>;
  assets: Map<string, { total: number; ready: number }>;
}) {
  const actionable = orders
    .filter((o) => !["won", "lost"].includes(o.state))
    .sort((a, b) => {
      const rank = (o: Order) => o.workflow_stage === "failed" ? 0 : o.workflow_stage === "plan_ready" ? 1 : o.workflow_stage === "studio_ready" ? 2 : o.state === "live" ? 3 : 9;
      return rank(a) - rank(b) || +new Date(b.updated_at) - +new Date(a.updated_at);
    })
    .slice(0, 30);
  const waiting = actionable.filter((o) => ["plan_ready", "studio_ready", "failed", "ready"].includes(o.workflow_stage) || o.state === "live").length;
  const building = actionable.filter((o) => ["planning", "creating", "building", "qa"].includes(o.workflow_stage)).length;

  return (
    <section>
      <div className="metric-strip">
        <div><b>{waiting}</b><span>Need you</span></div>
        <div><b>{building}</b><span>Agent working</span></div>
        <div><b>{orders.filter((o) => o.state === "live").length}</b><span>Build ready</span></div>
      </div>

      <div className="section-title"><h1>Work</h1><span>{actionable.length} active</span></div>
      {actionable.length === 0 ? <Empty text="Nothing needs attention." /> : actionable.map((o) => {
        const a = assets.get(o.id) ?? { total: 0, ready: 0 };
        const preview = internalPreview(o);
        return (
          <article className={`work-card tone-${stageTone(o.workflow_stage)}`} key={o.id}>
            <div className="card-top">
              <div className="grow">
                <div className="eyebrow">{stageLabel(o.workflow_stage)} · {ago(o.updated_at)}</div>
                <h2>{name(o)}</h2>
                <p>{[o.trade, o.location].filter(Boolean).join(" · ") || "Sarah chat"}</p>
              </div>
              <span className={`status-dot ${stageTone(o.workflow_stage)}`} />
            </div>
            <WorkMessage order={o} asset={a} />
            {o.failure_reason && <p className="inline-error">{o.failure_reason}</p>}
            <div className="button-row">
              <Link className="btn" href={`/orders/${o.id}`}>{o.workflow_stage === "plan_ready" ? "Review plan" : o.state === "live" ? "Open project" : "View"}</Link>
              {preview && <a className="btn btn--ghost" href={preview} target="_blank" rel="noreferrer">See site</a>}
              {!['live','sent','won','lost'].includes(o.state) && <ActionButton id={o.id} action="runNext" label="Run next step" busyLabel="Running…" className="btn btn--ghost" />}
            </div>
          </article>
        );
      })}

      <details className="activity panel">
        <summary>Recent activity <span>{events.length}</span></summary>
        <div className="activity-list">
          {events.slice(0, 30).map((e) => (
            <Link href={`/orders/${e.order_id}`} key={e.id} className="activity-item">
              <span className={`status-dot ${e.kind === "error" ? "red" : e.kind.includes("ready") || e.kind === "deployed" ? "green" : "grey"}`} />
              <div><b>{e.detail?.message || `${e.business_name ?? "Project"}: ${e.kind.replaceAll("_", " ")}`}</b><small>{ago(e.created_at)} ago</small></div>
            </Link>
          ))}
        </div>
      </details>
    </section>
  );
}

function WorkMessage({ order, asset }: { order: Order; asset: { total: number; ready: number } }) {
  if (order.workflow_stage === "plan_ready") return <p className="work-message">The Web99 Agent build plan is ready for you to edit and approve.</p>;
  if (order.workflow_stage === "studio_ready") return <p className="work-message">Copy is written. {asset.total ? `${asset.ready}/${asset.total} images generated.` : "No generated images needed."}</p>;
  if (order.workflow_stage === "planning") return <p className="work-message">Web99 Agent is analysing Sarah’s chat and making the 500–600 word build plan.</p>;
  if (order.workflow_stage === "creating") return <p className="work-message">Web99 Agent is improving the offer, writing the site and planning the imagery.</p>;
  if (order.workflow_stage === "building") return <p className="work-message">OpenAI is putting the approved copy and images together.</p>;
  if (order.workflow_stage === "qa") return <p className="work-message">OpenAI QA is checking and auto-repairing the build before it reaches you.</p>;
  if (order.state === "live") return <p className="work-message">The finished build is ready to inspect in Web99. Public deployment is a separate verified step.</p>;
  if (order.state === "sent") return <p className="work-message">Demo sent. Waiting on the customer.</p>;
  return <p className="work-message">Open this project to see what it needs next.</p>;
}

function LeadsTab({ orders, group }: { orders: Order[]; group: string }) {
  const leadOrders = orders.filter((o) => o.conversation?.length && !["live", "sent", "won"].includes(o.state));
  const groups = [
    ["all", "All"], ["lead", "Lead"], ["can_build", "Can build"], ["needs_customer", "Needs customer"], ["all_others", "Others"],
  ];
  const filtered = group === "all" ? leadOrders : leadOrders.filter((o) => qualificationFor(o) === group);
  return (
    <section>
      <div className="section-title"><h1>Sarah chats</h1><span>{leadOrders.length}</span></div>
      <div className="filter-pills">
        {groups.map(([key, label]) => <Link key={key} className={group === key ? "active" : ""} href={`/?tab=leads&group=${key}`}>{label}</Link>)}
      </div>
      {filtered.length === 0 ? <Empty text="No chats in this group." /> : filtered.map((o) => {
        const q = qualificationFor(o);
        const lastCustomer = [...o.conversation].reverse().find((t) => t.role === "user")?.content ?? "";
        return (
          <article className="lead-card panel" key={o.id}>
            <div className="card-top">
              <div className="grow"><div className={`qual q-${q}`}>{q.replace("_", " ")}</div><h2>{name(o)}</h2><p>{[o.trade, o.location].filter(Boolean).join(" · ") || "Unclassified business"}</p></div>
              <span className="age">{ago(o.updated_at)}</span>
            </div>
            {lastCustomer && <p className="chat-snippet">“{lastCustomer.slice(0, 180)}{lastCustomer.length > 180 ? "…" : ""}”</p>}
            <details className="mini-details">
              <summary>Details & chat</summary>
              <div className="detail-grid">
                <span><b>Email</b>{o.email || "—"}</span><span><b>Phone</b>{o.phone || "—"}</span>
              </div>
              <div className="chat-log">{o.conversation.slice(-8).map((t, i) => <p key={i}><b>{t.role === "user" ? "Customer" : "Sarah"}</b>{t.content}</p>)}</div>
            </details>
            <LeadControls id={o.id} email={o.email} businessName={name(o)} />
          </article>
        );
      })}
    </section>
  );
}

function QueueTab({ orders }: { orders: Order[] }) {
  const queued = orders.filter((o) => ["queued", "planning", "plan_ready"].includes(o.workflow_stage) || (o.plan_text && !o.studio_copy));
  return (
    <section>
      <div className="section-title"><h1>Queue</h1><span>{queued.length}</span></div>
      <p className="section-copy">The Web99 Agent analyses each queued Sarah chat and turns it into the editable build plan.</p>
      {queued.length === 0 ? <Empty text="Queue is clear. Queue a Sarah chat from Leads." /> : queued.map((o) => (
        <article className={`queue-card panel ${o.plan_text ? "plan-done" : ""}`} key={o.id}>
          <div className="card-top">
            <div className="grow"><div className="eyebrow">{o.plan_text ? "READY TO APPROVE" : "AGENT WORKING"}</div><h2>{name(o)}</h2><p>{[o.trade, o.location].filter(Boolean).join(" · ")}</p></div>
            <span className={`status-dot ${o.plan_text ? "green" : "blue"}`} />
          </div>
          {o.plan_text ? <p className="plan-preview">{o.plan_text.slice(0, 280)}…</p> : <p className="work-message">Analysing the chat, selling points, layout and imagery.</p>}
          <div className="button-row">
            <Link className="btn" href={`/orders/${o.id}`}>{o.plan_text ? "Read & approve" : "Open"}</Link>
            {o.plan_text && <ActionButton id={o.id} action="makePlan" label="Re-plan" busyLabel="Planning…" className="btn btn--ghost" />}
            <AutopilotSelect id={o.id} value={o.autopilot} />
          </div>
        </article>
      ))}
    </section>
  );
}

function StudioTab({ orders, assets }: { orders: Order[]; assets: Map<string, { total: number; ready: number }> }) {
  const studio = orders.filter((o) => o.studio_copy || ["creating", "studio_ready", "building", "qa", "ready"].includes(o.workflow_stage) || ["live", "sent", "won"].includes(o.state));
  return (
    <section>
      <div className="section-title"><h1>Studio</h1><span>{studio.length}</span></div>
      <p className="section-copy">Copy, image prompts, generated assets, OpenAI builds, QA and versions.</p>
      {studio.length === 0 ? <Empty text="Approved projects appear here." /> : studio.map((o) => {
        const a = assets.get(o.id) ?? { total: 0, ready: 0 };
        const preview = internalPreview(o);
        return (
          <article className="studio-card panel" key={o.id}>
            <div className="card-top"><div className="grow"><div className="eyebrow">{stageLabel(o.workflow_stage)}</div><h2>{name(o)}</h2><p>{preview ? "Build ready to inspect" : `${a.ready}/${a.total} images ready`}</p></div><span className={`status-dot ${stageTone(o.workflow_stage)}`} /></div>
            <div className="progress-line"><span style={{ width: `${preview ? 100 : o.workflow_stage === "building" ? 80 : o.studio_copy ? 55 : 30}%` }} /></div>
            <div className="button-row">
              <Link className="btn" href={`/orders/${o.id}`}>Open Studio</Link>
              {preview && <a className="btn btn--ghost" href={preview} target="_blank" rel="noreferrer">See site</a>}
              <AutopilotSelect id={o.id} value={o.autopilot} />
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Empty({ text }: { text: string }) { return <div className="empty panel"><b>All clear</b><p>{text}</p></div>; }
