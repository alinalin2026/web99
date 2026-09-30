import Link from "next/link";
import { ensureMasterSchema } from "@/lib/db";
import { loadFollowupStats, loadFunnelRows, summarizeFunnel } from "@/lib/funnel-stats";

export const dynamic = "force-dynamic";

const WINDOWS: { key: string; label: string; days: number | null }[] = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const query = await searchParams;
  const win = WINDOWS.find((w) => w.key === query.days) ?? WINDOWS[1];
  try {
    await ensureMasterSchema();
    const [rows, followups] = await Promise.all([loadFunnelRows(win.days), loadFollowupStats()]);
    const { steps, sources } = summarizeFunnel(rows);
    const top = steps[0]?.count ?? 0;
    return (
      <main className="master-shell">
        <style>{`.ftable th,.ftable td{padding:8px 12px 8px 0;text-align:left;vertical-align:top}.ftable th{font-weight:750}`}</style>
        <header className="master-header">
          <div><div className="brandline">Web<span>99</span><b>Control</b></div><p>Where people drop off between “hello” and “paid”</p></div>
          <span className="header-dot" />
        </header>
        <nav className="top-pills" aria-label="Dashboard sections">
          <Link className="top-pill" href="/?tab=leads">Leads</Link>
          <Link className="top-pill" href="/?tab=orders">Orders</Link>
          <Link className="top-pill" href="/?tab=email">Email</Link>
          <Link className="top-pill active" href="/funnel">Funnel</Link>
        </nav>

        <div className="filter-pills">
          {WINDOWS.map((w) => (
            <Link key={w.key} className={w.key === win.key ? "active" : ""} href={`/funnel?days=${w.key}`}>{w.label}</Link>
          ))}
        </div>

        <div className="section-title"><h1>Funnel</h1><span>{top} started in the last {win.label.toLowerCase()}</span></div>
        <section className="panel">
          {steps.map((s) => (
            <div key={s.key} style={{ margin: "0 0 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, fontWeight: 700 }}>
                <span>{s.label}</span>
                <span>{s.count} <span className="muted" style={{ fontWeight: 600 }}>· {s.ofStart}% of start{s.key === "createdAt" ? "" : ` · ${s.ofPrevious}% of previous`}</span></span>
              </div>
              <div className="progress-line" style={{ margin: "6px 0 0" }}><span style={{ width: `${Math.max(s.ofStart, s.count ? 1.5 : 0)}%` }} /></div>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Counts people, not visits. “Came back” means they reopened their saved website more than an hour after it was built.
            People who opened /start but never typed anything aren’t recorded.
          </p>
        </section>

        <div className="section-title"><h1>Where they came from</h1></div>
        <section className="panel">
          {sources.length === 0 ? <div className="empty"><b>Nothing yet</b><p>No conversations in this window.</p></div> : (
            <table className="ftable" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr className="muted" style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase" }}><th>Source</th><th>Started</th><th>Saw site</th><th>Wants it</th><th>Paid</th></tr></thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ fontWeight: 700 }}>{s.source}</td><td>{s.started}</td><td>{s.siteBuilt}</td><td>{s.wantsIt}</td><td>{s.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="section-title"><h1>Follow-up emails</h1></div>
        <section className="panel">
          {followups.length === 0 ? (
            <div className="empty"><b>None scheduled yet</b><p>Nudges are scheduled when someone’s website is first built: one at 24 hours, one at 3 days. Nothing goes out between 8pm and 8am, to anyone who bought, replied, unsubscribed or is active right now.</p></div>
          ) : (
            <table className="ftable" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr className="muted" style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase" }}><th>Nudge</th><th>Sent</th><th>Waiting</th><th>Skipped</th><th>Came back</th><th>Paid after</th></tr></thead>
              <tbody>
                {followups.map((f) => (
                  <tr key={f.kind} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ fontWeight: 700 }}>{f.label}</td><td>{f.sent}</td><td>{f.pending}</td><td>{f.cancelled}</td><td>{f.returned}</td><td>{f.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    );
  } catch (err) {
    return (
      <main className="master-shell"><section className="panel error-panel"><b>Couldn’t load the funnel</b><p>{(err as Error).message}</p></section></main>
    );
  }
}
