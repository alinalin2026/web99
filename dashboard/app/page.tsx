import Link from "next/link";
import {
  ensureMasterSchema, listOrders, listWorkEvents, qualificationFor, type Order,
} from "@/lib/db";
import { LeadControls } from "./MasterActions";
import { EmailComposer, type EmailOrderOption } from "./EmailComposer";

export const dynamic = "force-dynamic";

type Tab = "work" | "leads" | "plan" | "email";

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

function stageLabel(order: Order) {
  const stage = order.workflow_stage;
  if (order.state === "live" || internalPreview(order)) return "Ready to review";
  if (["failed", "job_failed"].includes(stage) || order.state === "failed") return "Needs you";
  if (["qa", "checking", "repairing"].includes(stage)) return "Checking";
  if (["queued_build", "creating", "studio_ready", "building", "fixing"].includes(stage) || order.state === "generating") return "Building";
  if (["queued", "planning"].includes(stage) || order.state === "analysing") return "Planning";
  if (stage === "plan_ready") return "Direction ready";
  if (order.state === "sent") return "Sent";
  return "Ready";
}

function stageTone(order: Order) {
  const label = stageLabel(order);
  if (label === "Needs you") return "red";
  if (["Ready to review", "Direction ready", "Sent"].includes(label)) return "green";
  if (["Planning", "Building", "Checking"].includes(label)) return "blue";
  return "grey";
}

function tabs(active: Tab) {
  const items: { key: Tab; label: string }[] = [
    { key: "work", label: "Work" },
    { key: "leads", label: "Leads" },
    { key: "plan", label: "Plan" },
    { key: "email", label: "Email" },
  ];
  return (
    <nav className="top-pills" aria-label="Dashboard sections">
      {items.map((tab) => (
        <Link key={tab.key} className={`top-pill ${active === tab.key ? "active" : ""}`} href={`/?tab=${tab.key}`}>
          {tab.label}
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
  // Old queue/studio bookmarks land on the new combined Plan screen.
  const requested = query.tab === "queue" || query.tab === "studio" ? "plan" : query.tab;
  const active = (["work", "leads", "plan", "email"].includes(requested ?? "") ? requested : "work") as Tab;

  try {
    await ensureMasterSchema();
    const [orders, events] = await Promise.all([listOrders(), listWorkEvents(60)]);

    return (
      <main className="master-shell">
        <header className="master-header">
          <div>
            <div className="brandline">Web<span>99</span> <b>Control</b></div>
            <p>{active === "work" ? "What needs you right now" : active === "leads" ? "New Sarah conversations" : active === "email" ? "Send someone an email by hand" : "Approve direction once, then let Web99 build"}</p>
          </div>
          <div className="header-dot" title="Dashboard online" />
        </header>
        {tabs(active)}

        {active === "work" && <WorkTab orders={orders} events={events} />}
        {active === "leads" && <LeadsTab orders={orders} group={query.group ?? "all"} />}
        {active === "plan" && <PlanTab orders={orders} />}
        {active === "email" && <EmailTab orders={orders} />}
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

function WorkTab({ orders, events }: { orders: Order[]; events: Awaited<ReturnType<typeof listWorkEvents>> }) {
  const actionable = orders
    .filter((o) => !["won", "lost"].includes(o.state))
    .sort((a, b) => {
      const rank = (o: Order) => {
        const s = stageLabel(o);
        return s === "Needs you" ? 0 : s === "Direction ready" ? 1 : s === "Ready to review" ? 2 : s === "Sent" ? 8 : 5;
      };
      return rank(a) - rank(b) || +new Date(b.updated_at) - +new Date(a.updated_at);
    })
    .slice(0, 30);

  const waiting = actionable.filter((o) => ["Needs you", "Direction ready", "Ready to review"].includes(stageLabel(o))).length;
  const building = actionable.filter((o) => ["Planning", "Building", "Checking"].includes(stageLabel(o))).length;
  const ready = actionable.filter((o) => stageLabel(o) === "Ready to review").length;

  const usefulEvents = events.filter((e) => ![
    "state_change", "workflow", "image_ready", "job_completed"
  ].includes(e.kind));

  return (
    <section>
      <div className="metric-strip">
        <div><b>{waiting}</b><span>Need you</span></div>
        <div><b>{building}</b><span>Working</span></div>
        <div><b>{ready}</b><span>Ready</span></div>
      </div>

      <div className="section-title"><h1>Work</h1><span>{actionable.length} active</span></div>
      {actionable.length === 0 ? <Empty text="Nothing needs attention." /> : actionable.map((o) => {
        const preview = internalPreview(o);
        const label = stageLabel(o);
        return (
          <article className={`work-card tone-${stageTone(o)}`} key={o.id}>
            <div className="card-top">
              <div className="grow">
                <div className="eyebrow">{label} · {ago(o.updated_at)}</div>
                <h2>{name(o)}</h2>
                <p>{[o.trade, o.location].filter(Boolean).join(" · ") || "Sarah chat"}</p>
              </div>
              <span className={`status-dot ${stageTone(o)}`} />
            </div>
            <WorkMessage order={o} />
            {(label === "Needs you") && o.failure_reason && <p className="inline-error">{o.failure_reason}</p>}
            <div className="button-row">
              <Link className="btn" href={`/orders/${o.id}`}>
                {label === "Direction ready" ? "Review & build" : label === "Ready to review" ? "Review website" : "Open"}
              </Link>
              {preview && <a className="btn btn--ghost" href={preview} target="_blank" rel="noreferrer">See site</a>}
            </div>
          </article>
        );
      })}

      <details className="activity panel">
        <summary>Recent activity <span>{usefulEvents.length}</span></summary>
        <div className="activity-list">
          {usefulEvents.slice(0, 25).map((e) => (
            <Link href={`/orders/${e.order_id}`} key={e.id} className="activity-item">
              <span className={`status-dot ${e.kind.includes("failed") || e.kind === "error" ? "red" : e.kind.includes("ready") || e.kind === "deployed" || e.kind === "build_approved" ? "green" : "grey"}`} />
              <div><b>{e.detail?.message || `${e.business_name ?? "Project"}: update`}</b><small>{ago(e.created_at)} ago</small></div>
            </Link>
          ))}
        </div>
      </details>
    </section>
  );
}

function WorkMessage({ order }: { order: Order }) {
  const s = stageLabel(order);
  if (s === "Direction ready") return <p className="work-message">Direction is ready. Read it, add any taste notes, then approve once.</p>;
  if (s === "Planning") return <p className="work-message">Web99 is turning Sarah’s chat into a website direction.</p>;
  if (s === "Building") return <p className="work-message">Web99 is writing, creating visuals and building the website in the background.</p>;
  if (s === "Checking") return <p className="work-message">Web99 is checking the finished website and repairing anything it finds.</p>;
  if (s === "Ready to review") return <p className="work-message">Finished website is ready. Review it, request a change, or send it.</p>;
  if (s === "Sent") return <p className="work-message">Sent. Waiting on the customer.</p>;
  if (s === "Needs you") return <p className="work-message">Automatic retries could not finish this one. Open it to see what needs attention.</p>;
  return <p className="work-message">Open this project to continue.</p>;
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

function PlanTab({ orders }: { orders: Order[] }) {
  const projects = orders.filter((o) =>
    !["collecting", "won", "lost"].includes(o.state) || Boolean(o.plan_text)
  ).sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));

  return (
    <section>
      <div className="section-title"><h1>Plan</h1><span>{projects.length}</span></div>
      <p className="section-copy">One place for direction and builds. You approve once; copy, images, build and checks happen automatically.</p>
      {projects.length === 0 ? <Empty text="Projects appear here after a Sarah lead is sent for planning." /> : projects.map((o) => {
        const label = stageLabel(o);
        const preview = internalPreview(o);
        return (
          <article className="queue-card panel" key={o.id}>
            <div className="card-top">
              <div className="grow"><div className="eyebrow">{label.toUpperCase()}</div><h2>{name(o)}</h2><p>{[o.trade, o.location].filter(Boolean).join(" · ")}</p></div>
              <span className={`status-dot ${stageTone(o)}`} />
            </div>
            {o.plan_text && label === "Direction ready" ? <p className="plan-preview">{o.plan_text.slice(0, 280)}…</p> : <WorkMessage order={o} />}
            <div className="button-row">
              <Link className="btn" href={`/orders/${o.id}`}>{label === "Direction ready" ? "Review & build" : label === "Ready to review" ? "Review website" : "Open"}</Link>
              {preview && <a className="btn btn--ghost" href={preview} target="_blank" rel="noreferrer">See site</a>}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function EmailTab({ orders }: { orders: Order[] }) {
  const eligible = orders.filter((o) => o.conversation?.length || o.email);
  const options: EmailOrderOption[] = eligible
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .map((o) => ({
      id: o.id,
      label: `${name(o)}${o.email ? ` — ${o.email}` : ""}`,
      email: o.email,
      businessName: name(o),
      previewUrl: o.preview_url,
      done: o.state === "won",
    }));

  return (
    <section>
      <div className="section-title"><h1>Email</h1><span>{options.length} people</span></div>
      <p className="section-copy">Pick someone from Leads or Done, or type an address in by hand. Choose a template and fill in whatever it needs — everything's editable before you send.</p>
      <EmailComposer orders={options} />
    </section>
  );
}

function Empty({ text }: { text: string }) { return <div className="empty panel"><b>All clear</b><p>{text}</p></div>; }
