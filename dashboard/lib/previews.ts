import { sql, jsonb, logEvent, ensureMasterSchema } from "./db";
import type { Site } from "./site-schema";

export interface Preview {
  id: string;
  category: string;
  site: Site;
  order_id: string | null;
  created_at: string;
}

export async function createPreview(site: Site): Promise<Preview> {
  await ensureMasterSchema();
  const [row] = await sql<Preview[]>`
    INSERT INTO previews (category, site)
    VALUES (${site.category}, ${jsonb(site)})
    RETURNING *`;
  return row;
}

export async function getPreview(id: string): Promise<Preview | null> {
  await ensureMasterSchema();
  const [row] = await sql<Preview[]>`SELECT * FROM previews WHERE id = ${id}`;
  return row ?? null;
}

/** One row per funnel step. `kind` is a plain string: "step_1" .. "step_7",
    "reveal", "buy_click", "email_click". Called from the client, so
    preview_id may reference a preview from a different request. */
export async function logPreviewEvent(
  previewId: string | null,
  kind: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await ensureMasterSchema();
  await sql`
    INSERT INTO preview_events (preview_id, kind, detail)
    VALUES (${previewId}, ${kind}, ${jsonb(detail)})`;
}

/** Buy button → creates (or reuses) an orders row from a saved preview, so
    the existing /buy/[id] Stripe route and /choose/[id] checklist work
    completely unchanged once STRIPE_SECRET_KEY is set. Idempotent: calling
    twice for the same preview returns the same order. */
export async function promotePreviewToOrder(previewId: string): Promise<string> {
  await ensureMasterSchema();
  const preview = await getPreview(previewId);
  if (!preview) throw new Error(`Preview ${previewId} not found`);
  if (preview.order_id) return preview.order_id;

  const site = preview.site;
  const [created] = await sql<{ id: string }[]>`
    INSERT INTO orders (state, conversation, workflow_stage, business_name, trade, location, phone, preview_url, brief)
    VALUES (
      'collecting', '[]'::jsonb, 'new',
      ${site.name}, ${site.trade}, ${site.town}, ${site.phone ?? null},
      ${`${process.env.APP_URL ?? "https://web99.ie"}/p/${previewId}`},
      ${jsonb({ source: "instant_preview", previewId, site })}
    )
    RETURNING id`;

  await sql`UPDATE previews SET order_id = ${created.id} WHERE id = ${previewId}`;
  await logEvent(created.id, "state_change", { step: "instant_preview_order_created", previewId });
  return created.id;
}

/** "Email me this preview" — same lead-capture path as Buy (promotes to an
    orders row so it shows up for Alin like any other lead), just stops
    short of Stripe. Returns the order so the caller can send the email. */
export async function capturePreviewLead(previewId: string, email: string): Promise<string> {
  const orderId = await promotePreviewToOrder(previewId);
  await sql`UPDATE orders SET email = ${email} WHERE id = ${orderId}`;
  await logEvent(orderId, "email", { template: "previewReady", to: email });
  return orderId;
}
