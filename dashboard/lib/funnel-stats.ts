/* The conversion funnel: of the people who started talking to Sarah, how many got as far as each step?
   Every step is a fact already recorded in order_events / orders, so there is nothing extra to instrument
   except "came back" (workspace_opened, logged when the saved-site link is opened).

   summarizeFunnel() is pure (rows in, numbers out) so the arithmetic is tested without a database. */
import { sql } from "./db";

export interface FunnelRow {
  createdAt: string | Date;
  email: boolean;
  siteBuilt: boolean;
  chatted: boolean;
  cameBack: boolean;
  wantsIt: boolean;
  paid: boolean;
  source: string;
}

export interface FunnelStep { key: string; label: string; count: number; ofStart: number; ofPrevious: number }
export interface SourceRow { source: string; started: number; siteBuilt: number; wantsIt: number; paid: number }

export const STEPS: { key: keyof FunnelRow; label: string }[] = [
  { key: "createdAt", label: "Started talking to Sarah" },
  { key: "email", label: "Gave their email" },
  { key: "siteBuilt", label: "Saw their website" },
  { key: "chatted", label: "Chatted about it" },
  { key: "cameBack", label: "Came back later" },
  { key: "wantsIt", label: "Tapped “I love it”" },
  { key: "paid", label: "Paid" },
];

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/* Each step counts people who did THAT thing. "Chatted" and "came back" are side branches (you can buy without
   either), so "of previous" compares them with the last main step (saw their website); "paid" is compared with
   "tapped I love it". "Of start" is always against everyone who started. */
export function summarizeFunnel(rows: FunnelRow[]): { steps: FunnelStep[]; sources: SourceRow[] } {
  const steps: FunnelStep[] = [];
  let previous = rows.length;
  STEPS.forEach((step, i) => {
    const count = i === 0 ? rows.length : rows.filter((r) => Boolean(r[step.key])).length;
    steps.push({ key: String(step.key), label: step.label, count, ofStart: pct(count, rows.length), ofPrevious: i === 0 ? 100 : pct(count, previous) });
    if (i === 0 || step.key === "email" || step.key === "siteBuilt" || step.key === "wantsIt") previous = count;
  });
  const by = new Map<string, SourceRow>();
  for (const r of rows) {
    const s = by.get(r.source) ?? { source: r.source, started: 0, siteBuilt: 0, wantsIt: 0, paid: 0 };
    s.started++;
    if (r.siteBuilt) s.siteBuilt++;
    if (r.wantsIt) s.wantsIt++;
    if (r.paid) s.paid++;
    by.set(r.source, s);
  }
  return { steps, sources: [...by.values()].sort((a, b) => b.started - a.started) };
}

/* utm_source wins; a bare Facebook click id means a Facebook ad; anything else is direct/organic. */
export function sourceOf(utmSource: string | null, fbclid: string | null): string {
  const u = (utmSource ?? "").trim().toLowerCase();
  if (u) return u.slice(0, 40);
  if (fbclid) return "facebook";
  return "direct / organic";
}

export interface FollowupStat { kind: string; label: string; sent: number; pending: number; cancelled: number; returned: number; paid: number }

export async function loadFunnelRows(days: number | null): Promise<FunnelRow[]> {
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : "1970-01-01T00:00:00Z";
  const rows = await sql<{
    created_at: string; email: boolean; site_built: boolean; chatted: boolean; came_back: boolean; wants_it: boolean; paid: boolean;
    utm_source: string | null; fbclid: string | null;
  }[]>`
    SELECT o.created_at, (o.email IS NOT NULL) AS email,
      EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id AND e.kind = 'instant_site' AND e.detail ? 'html') AS site_built,
      EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id AND e.kind = 'preview_chat' AND e.detail->>'role' = 'user') AS chatted,
      EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id AND e.kind = 'workspace_opened'
        AND e.created_at > (SELECT min(b.created_at) FROM order_events b WHERE b.order_id = o.id AND b.kind = 'instant_site') + interval '1 hour') AS came_back,
      EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id AND e.kind = 'wants_it') AS wants_it,
      (o.paid_at IS NOT NULL OR o.state::text = 'won') AS paid,
      o.brief #>> '{attribution,utm_source}' AS utm_source,
      o.brief #>> '{attribution,fbclid}' AS fbclid
    FROM orders o
    WHERE o.created_at >= ${since} AND jsonb_array_length(coalesce(o.conversation, '[]'::jsonb)) > 0
    ORDER BY o.created_at DESC`;
  return rows.map((r) => ({
    createdAt: r.created_at, email: r.email, siteBuilt: r.site_built, chatted: r.chatted, cameBack: r.came_back,
    wantsIt: r.wants_it, paid: r.paid, source: sourceOf(r.utm_source, r.fbclid),
  }));
}

export async function loadFollowupStats(): Promise<FollowupStat[]> {
  const rows = await sql<{ kind: string; sent: string; pending: string; cancelled: string; returned: string; paid: string }[]>`
    SELECT f.kind,
      count(*) FILTER (WHERE f.status = 'sent') AS sent,
      count(*) FILTER (WHERE f.status = 'pending') AS pending,
      count(*) FILTER (WHERE f.status = 'cancelled') AS cancelled,
      count(*) FILTER (WHERE f.status = 'sent' AND EXISTS (
        SELECT 1 FROM order_events e WHERE e.order_id = f.order_id AND e.kind = 'workspace_opened'
          AND e.detail->>'src' = CASE f.kind WHEN 'site_24h' THEN 'f24' ELSE 'f3d' END AND e.created_at > f.sent_at)) AS returned,
      count(*) FILTER (WHERE f.status = 'sent' AND o.paid_at > f.sent_at) AS paid
    FROM followups f JOIN orders o ON o.id = f.order_id
    WHERE f.kind IN ('site_24h', 'site_3d')
    GROUP BY f.kind ORDER BY f.kind`;
  const label: Record<string, string> = { site_24h: "24 hours after their site", site_3d: "3 days after their site" };
  return rows.map((r) => ({ kind: r.kind, label: label[r.kind] ?? r.kind, sent: Number(r.sent), pending: Number(r.pending), cancelled: Number(r.cancelled), returned: Number(r.returned), paid: Number(r.paid) }));
}
