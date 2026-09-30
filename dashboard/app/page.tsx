import Link from "next/link";
import { ensureMasterSchema, listOrders, qualificationFor, type Order } from "@/lib/db";
import { euro, loadFunnel, type FunnelInfo } from "@/lib/funnel";
import { siteOrigin } from "@/lib/instant-site";
import { LeadControls } from "./MasterActions";
import { EmailComposer, type EmailOrderOption } from "./EmailComposer";

export const dynamic = "force-dynamic";

type Tab = "leads" | "orders" | "email";
type Stage = "paid" | "built" | "can_build" | "chatting" | "lost";

const STAGE_LABEL: Record<Stage, string> = {
  paid: "Paid", built: "Site built", can_build: "Can build", chatting: "Chatting", lost: "Lost",
};

function ago(iso: string | Date): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function day(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

function name(order: Order) { return order.business_name || order.trade || order.slug || "Unnamed lead"; }

function hasPaid(o: Order) { return Boolean(o.paid_at) || o.state === "won"; }

function stageOf(o: Order, f: FunnelInfo | undefined): Stage {
  if (hasPaid(o)) return "paid";
  if (o.state === "lost") return "lost";
  if (f?.siteBuiltAt || f?.previewId || o.generated || o.state === "live" || o.state === "sent") return "built";
  const q = qualificationFor(o);
  return q === "lead" || q === "can_build" ? "can_build" : "chatting";
}

/* Every page that shows the site the customer was given, one place to build the links. */
function siteLinks(o: Order, f: FunnelInfo | undefined): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (f?.siteBuiltAt) links.push({ label: "View website", href: `/api/instant-site/view/${o.id}` });
  if (f?.previewId) links.push({ label: f.previewCategory ? `Chosen design (${f.previewCategory})` : "Chosen design", href: `/p/${f.previewId}` });
  if (o.slug && o.generated) links.push({ label: "Built site", href: `/preview/${o.slug}` });
  return links;
}

function tabs(active: Tab) {
  const items: { key: Tab; label: string }[] = [
    { key: "leads", label: "Leads" },
    { key: "orders", label: "Orders" },
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

const SUBTITLE: Record<Tab, string> = {
  leads: "Sarah conversations, and who has a site",
  orders: "Who has paid, and for what",
  email: "Send someone an email by hand",
};

export default async function MasterDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; group?: string }>;
}) {
  const query = await searchParams;
  // Old bookmarks (work / plan / customers / queue / studio) land on Leads.
  const active: Tab = query.tab === "orders" || query.tab === "email" ? query.tab : "leads";

  try {
    await ensureMasterSchema();
    const [orders, funnel] = await Promise.all([listOrders(), loadFunnel()]);
    // Anyone with a chat, contact, payment or a site — including a built project that has no chat behind it.
    const people = orders.filter((o) =>
      o.conversation?.length || o.email || hasPaid(o) || o.generated || o.state === "live" || o.state === "sent" || funnel.get(o.id)?.previewId
    );

    return (
      <main className="master-shell">
        <header className="master-header">
          <div>
            <div className="brandline">Web<span>99</span> <b>Control</b></div>
            <p>{SUBTITLE[active]}</p>
          </div>
          <div className="header-dot" title="Dashboard online" />
        </header>
        {tabs(active)}

        {active === "leads" && <LeadsTab orders={people} funnel={funnel} group={query.group ?? "all"} />}
        {active === "orders" && <OrdersTab orders={people} funnel={funnel} />}
        {active === "email" && <EmailTab orders={people} funnel={funnel} />}
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

function Metrics({ items }: { items: { value: string | number; label: string }[] }) {
  return (
    <div className={`metric-strip cols-${items.length}`}>
      {items.map((m) => <div key={m.label}><b>{m.value}</b><span>{m.label}</span></div>)}
    </div>
  );
}

function revenue(paid: Order[], funnel: Map<string, FunnelInfo>): string {
  const known = paid.map((o) => funnel.get(o.id)?.paidCents).filter((c): c is number => typeof c === "number");
  const total = known.reduce((sum, c) => sum + c, 0);
  return `${euro(total)}${known.length < paid.length ? "+" : ""}`;
}

function Contact({ order }: { order: Order }) {
  if (!order.email && !order.phone) return <span className="chip">No contact yet</span>;
  return (
    <>
      {order.email && <a className="chip" href={`mailto:${order.email}`}>{order.email}</a>}
      {order.phone && <a className="chip" href={`tel:${order.phone.replace(/\s+/g, "")}`}>{order.phone}</a>}
    </>
  );
}

function SiteButtons({ links }: { links: { label: string; href: string }[] }) {
  if (!links.length) return null;
  return (
    <div className="button-row">
      {links.map((l, i) => (
        <a key={l.href} className={i === 0 ? "btn" : "btn btn--ghost"} href={l.href} target="_blank" rel="noopener">{l.label} ↗</a>
      ))}
    </div>
  );
}

function LeadsTab({ orders, funnel, group }: { orders: Order[]; funnel: Map<string, FunnelInfo>; group: string }) {
  const stages = new Map(orders.map((o) => [o.id, stageOf(o, funnel.get(o.id))]));
  const count = (s: Stage) => orders.filter((o) => stages.get(o.id) === s).length;
  const paid = orders.filter((o) => stages.get(o.id) === "paid");
  const builtOrPaid = count("built") + paid.length;

  const groups: [string, string][] = [
    ["all", "All"], ["chatting", "Chatting"], ["can_build", "Can build"], ["built", "Site built"], ["paid", "Paid"],
  ];
  const filtered = group === "all" ? orders : orders.filter((o) => stages.get(o.id) === group);

  return (
    <section>
      <Metrics items={[
        { value: orders.length, label: "Leads" },
        { value: builtOrPaid, label: "Sites built" },
        { value: paid.length, label: "Paid" },
        { value: revenue(paid, funnel), label: "Revenue" },
      ]} />
      <div className="filter-pills">
        {groups.map(([key, label]) => <Link key={key} className={group === key ? "active" : ""} href={`/?tab=leads&group=${key}`}>{label}{key !== "all" ? ` · ${count(key as Stage)}` : ""}</Link>)}
      </div>
      {filtered.length === 0 ? <Empty text="No one in this group yet." /> : filtered.map((o) => {
        const f = funnel.get(o.id);
        const stage = stages.get(o.id) as Stage;
        const lastCustomerTurn = [...(o.conversation ?? [])].reverse().find((t) => t.role === "user");
        const lastCustomer = lastCustomerTurn?.content
          || (lastCustomerTurn?.attachments?.length ? `📎 ${lastCustomerTurn.attachments.map((a) => a.filename).join(", ")}` : "");
        return (
          <article className="lead-card panel" key={o.id}>
            <div className="card-top">
              <div className="grow">
                <div className={`qual q-${stage}`}>{STAGE_LABEL[stage]}</div>
                <h2>{name(o)}</h2>
                <p>{[o.trade, o.location].filter(Boolean).join(" · ") || "Unclassified business"}</p>
              </div>
              <span className="age">{ago(o.updated_at)}</span>
            </div>
            <div className="chips">
              <Contact order={o} />
              {f?.siteBuiltAt && <span className="chip chip--blue">Site built {ago(f.siteBuiltAt)} ago</span>}
              {hasPaid(o) && <span className="chip chip--violet">Paid{f?.paidCents != null ? ` ${euro(f.paidCents)}` : ""}</span>}
            </div>
            {lastCustomer && <p className="chat-snippet">“{lastCustomer.slice(0, 180)}{lastCustomer.length > 180 ? "…" : ""}”</p>}
            <SiteButtons links={siteLinks(o, f)} />
            <details className="mini-details">
              <summary>Details & chat</summary>
              <div className="chat-log">{(o.conversation ?? []).slice(-8).map((t, i) => (
                <p key={i}>
                  <b>{t.role === "user" ? "Customer" : "Sarah"}</b>{t.content}
                  {t.attachments?.length ? (
                    <span className="attachment-list">
                      {t.attachments.map((a) => (
                        <a key={a.id} href={`/control/api/attachments/${a.id}`} target="_blank" rel="noopener">
                          {" "}📎 {a.filename}
                        </a>
                      ))}
                    </span>
                  ) : null}
                </p>
              ))}</div>
              <p className="section-copy" style={{ margin: "10px 0 0" }}><Link href={`/orders/${o.id}`}>Full project page</Link></p>
            </details>
            <LeadControls id={o.id} email={o.email} businessName={name(o)} canDelete={!hasPaid(o)} />
          </article>
        );
      })}
    </section>
  );
}

function retentionText(o: Order): string {
  if (o.retention === "stayed") return "Keeping the site on Web99";
  if (o.retention === "left") return "Taking the site and leaving";
  return "Hasn't chosen hosting yet";
}

function OrdersTab({ orders, funnel }: { orders: Order[]; funnel: Map<string, FunnelInfo> }) {
  const paid = orders
    .filter(hasPaid)
    .sort((a, b) => +new Date(b.paid_at ?? b.updated_at) - +new Date(a.paid_at ?? a.updated_at));
  const waiting = orders.filter((o) => !hasPaid(o) && o.state !== "lost" && stageOf(o, funnel.get(o.id)) === "built");

  return (
    <section>
      <Metrics items={[
        { value: paid.length, label: "Paid orders" },
        { value: revenue(paid, funnel), label: "Revenue" },
        { value: waiting.length, label: "Built, not paid" },
      ]} />

      <div className="section-title"><h1>Paid</h1><span>{paid.length}</span></div>
      {paid.length === 0 ? <Empty text="No payments yet." /> : paid.map((o) => {
        const f = funnel.get(o.id);
        return (
          <article className="lead-card panel paid-card" key={o.id}>
            <div className="card-top">
              <div className="grow">
                <div className="qual q-paid">Paid{o.paid_at ? ` · ${day(o.paid_at)}` : ""}</div>
                <h2>{name(o)}</h2>
                <p>{[o.trade, o.location].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <span className="amount">{f?.paidCents != null ? euro(f.paidCents) : "Paid"}</span>
            </div>
            <div className="detail-grid">
              <span><b>Bought</b>Web99 website{f?.paidCents == null ? " (amount not recorded)" : ""}</span>
              <span><b>Hosting</b>{retentionText(o)}</span>
            </div>
            <div className="chips"><Contact order={o} /></div>
            <SiteButtons links={siteLinks(o, f)} />
            <div className="button-row">
              <Link className="btn btn--ghost" href={`/orders/${o.id}`}>Project page</Link>
              {o.email && <a className="btn btn--ghost" href={`mailto:${o.email}`}>Email</a>}
            </div>
          </article>
        );
      })}

      <div className="section-title" style={{ marginTop: 26 }}><h1>Built, not paid</h1><span>{waiting.length}</span></div>
      <p className="section-copy">They have seen their site but haven't paid yet — the ones worth a nudge.</p>
      {waiting.length === 0 ? <Empty text="Everyone with a site has paid." /> : waiting.map((o) => {
        const f = funnel.get(o.id);
        return (
          <article className="lead-card panel" key={o.id}>
            <div className="card-top">
              <div className="grow">
                <h2>{name(o)}</h2>
                <p>{[o.trade, o.location].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <span className="age">{f?.siteBuiltAt ? `built ${ago(f.siteBuiltAt)} ago` : ago(o.updated_at)}</span>
            </div>
            <div className="chips"><Contact order={o} /></div>
            <SiteButtons links={siteLinks(o, f)} />
          </article>
        );
      })}
    </section>
  );
}

function EmailTab({ orders, funnel }: { orders: Order[]; funnel: Map<string, FunnelInfo> }) {
  const origin = siteOrigin();
  const options: EmailOrderOption[] = orders
    .filter((o) => o.conversation?.length || o.email)
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .map((o) => ({
      id: o.id,
      label: `${name(o)}${o.email ? ` — ${o.email}` : ""}`,
      email: o.email,
      businessName: name(o),
      // The link a customer can open: their built site if there is one, else the page they saw in the chat.
      previewUrl: o.preview_url ?? (funnel.get(o.id)?.siteBuiltAt ? `${origin}/api/instant-site/view/${o.id}` : null),
      done: hasPaid(o),
    }));

  return (
    <section>
      <div className="section-title"><h1>Email</h1><span>{options.length} people</span></div>
      <p className="section-copy">Pick someone, or type an address in by hand. Choose a template and fill in whatever it needs — everything's editable before you send.</p>
      <EmailComposer orders={options} />
    </section>
  );
}

function Empty({ text }: { text: string }) { return <div className="empty panel"><b>All clear</b><p>{text}</p></div>; }
