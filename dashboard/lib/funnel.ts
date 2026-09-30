/* What the dashboard needs to answer "who built, who paid, for what, which site":
   facts that live outside the orders row. One query, no HTML loaded — the saved
   page is only ever fetched when someone clicks "View site". */
import { sql } from "./db";

export interface FunnelInfo {
  /* When the full-page preview shown in the chat was generated. */
  siteBuiltAt: string | null;
  /* Older quiz visitors picked a design; this is the preview they chose. */
  previewId: string | null;
  previewCategory: string | null;
  /* They pressed "Yes, I love it" (GET /buy/[id]). */
  wantsIt: boolean;
  /* They pressed "Keep this for me" and we emailed them a link back (latest time). */
  savedAt: string | null;
  /* Cents charged, from the Stripe webhook's "paid" event. Null if the order
     was marked paid by hand, or hasn't paid. */
  paidCents: number | null;
}

interface Row {
  id: string;
  site_built_at: string | null;
  preview_id: string | null;
  preview_category: string | null;
  paid_cents: string | null;
  wants_it: boolean;
  saved_at: string | null;
}

export async function loadFunnel(): Promise<Map<string, FunnelInfo>> {
  const rows = await sql<Row[]>`
    SELECT o.id,
      (SELECT max(e.created_at) FROM order_events e
        WHERE e.order_id = o.id AND e.kind = 'instant_site') AS site_built_at,
      (SELECT p.id FROM previews p WHERE p.order_id = o.id ORDER BY p.created_at DESC LIMIT 1) AS preview_id,
      (SELECT p.category FROM previews p WHERE p.order_id = o.id ORDER BY p.created_at DESC LIMIT 1) AS preview_category,
      EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = o.id AND e.kind = 'wants_it') AS wants_it,
      (SELECT max(e.created_at) FROM order_events e WHERE e.order_id = o.id AND e.kind = 'saved_for_later') AS saved_at,
      (SELECT (e.detail->>'amount') FROM order_events e
        WHERE e.order_id = o.id AND e.kind = 'state_change' AND e.detail->>'step' = 'paid'
        ORDER BY e.created_at DESC LIMIT 1) AS paid_cents
    FROM orders o`;
  return new Map(
    rows.map((r) => {
      const cents = r.paid_cents != null && /^\d+$/.test(r.paid_cents) ? Number(r.paid_cents) : null;
      return [r.id, { siteBuiltAt: r.site_built_at, previewId: r.preview_id, previewCategory: r.preview_category, wantsIt: r.wants_it, savedAt: r.saved_at, paidCents: cents }];
    })
  );
}

export function euro(cents: number): string {
  return `€${(cents / 100).toLocaleString("en-IE", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
