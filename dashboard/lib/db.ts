import postgres from "postgres";
import { MASTER_MIGRATION_SQL } from "@/db/schema";

/* One lazy Postgres client reused across hot reloads. */
declare global {
  // eslint-disable-next-line no-var
  var __web99sql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __web99MasterSchema: Promise<void> | undefined;
}

function client(): ReturnType<typeof postgres> {
  if (global.__web99sql) return global.__web99sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  const created = postgres(url, { max: 10, idle_timeout: 20, prepare: false });
  global.__web99sql = created;
  return created;
}

type Sql = ReturnType<typeof postgres>;
export const sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_t, _self, args) => (client() as any)(...args),
  get: (_t, prop) => (client() as any)[prop],
}) as Sql;

/** Migrate old dashboard databases automatically on the first master-dashboard request. */
export async function ensureMasterSchema(): Promise<void> {
  if (!global.__web99MasterSchema) {
    global.__web99MasterSchema = sql.unsafe(MASTER_MIGRATION_SQL).then(() => undefined);
  }
  return global.__web99MasterSchema;
}

export type OrderState =
  | "collecting"
  | "ready"
  | "analysing"
  | "generating"
  | "review"
  | "live"
  | "sent"
  | "won"
  | "lost"
  | "failed";

export type LeadQualification = "lead" | "can_build" | "needs_customer" | "all_others";
export type AutopilotMode = "manual" | "assisted" | "full";

export interface Order {
  id: string;
  state: OrderState;
  business_name: string | null;
  trade: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  conversation: { role: "user" | "assistant"; content: string; at: string }[];
  brief: Record<string, unknown> | null;
  analysis: Record<string, unknown> | null;
  generated: Record<string, string> | null;
  generator_notes: string | null;
  slug: string | null;
  preview_url: string | null;
  commit_sha: string | null;
  stripe_session_id: string | null;
  paid_at: string | null;
  retention: "stayed" | "left" | null;
  failure_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  expires_at: string | null;
  qualification: string;
  workflow_stage: string;
  autopilot: AutopilotMode;
  plan_text: string | null;
  studio_copy: string | null;
  studio_data: Record<string, unknown> | null;
  build_provider: string | null;
  build_job_id: string | null;
  qa_report: Record<string, unknown> | null;
  version_no: number;
  customer_status: string;
  followup_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectAsset {
  id: string;
  order_id: string;
  asset_key: string;
  title: string;
  kind: "logo" | "photo" | "illustration" | string;
  size: string | null;
  prompt: string;
  status: string;
  data_url: string | null;
  error: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkEvent {
  id: number;
  order_id: string;
  kind: string;
  detail: Record<string, any>;
  created_at: string;
  business_name: string | null;
  trade: string | null;
  workflow_stage: string;
  state: OrderState;
}

export async function getOrder(id: string): Promise<Order | null> {
  await ensureMasterSchema();
  const [row] = await sql<Order[]>`SELECT * FROM orders WHERE id = ${id}`;
  return row ?? null;
}

export async function listOrders(state?: OrderState): Promise<Order[]> {
  await ensureMasterSchema();
  if (state) {
    return sql<Order[]>`SELECT * FROM orders WHERE state = ${state} ORDER BY updated_at DESC LIMIT 300`;
  }
  return sql<Order[]>`SELECT * FROM orders ORDER BY updated_at DESC LIMIT 300`;
}

export async function stateCounts(): Promise<Record<string, number>> {
  await ensureMasterSchema();
  const rows = await sql<{ state: string; n: string }[]>`
    SELECT state, count(*)::text AS n FROM orders GROUP BY state`;
  return Object.fromEntries(rows.map((r) => [r.state, Number(r.n)]));
}

export function qualificationFor(order: Order): LeadQualification {
  if (order.state === "lost") return "all_others";
  const b = (order.brief ?? {}) as Record<string, any>;
  const services = Array.isArray(b.services) ? b.services.filter(Boolean) : [];
  const hasContact = Boolean(order.email || order.phone || b.email || b.phone);
  const hasIdentity = Boolean(order.business_name || b.businessName || order.trade || b.trade);
  const hasBuildMaterial = Boolean(
    order.trade || b.trade || b.websiteGoal || services.length || b.description || b.about
  );
  const full = Boolean(
    b.readyToBuild === true ||
      (order.email && (order.business_name || order.trade) && hasBuildMaterial && b.anythingElseClosed)
  );
  if (full || (order.state !== "collecting" && order.state !== "failed" && hasContact && hasBuildMaterial)) {
    return "lead";
  }
  if (hasContact && hasIdentity && hasBuildMaterial) return "can_build";
  if (hasContact || (hasIdentity && order.conversation.length >= 4)) return "needs_customer";
  return "all_others";
}

export async function syncQualification(order: Order): Promise<LeadQualification> {
  const qualification = qualificationFor(order);
  if (order.qualification !== qualification) {
    await sql`UPDATE orders SET qualification = ${qualification} WHERE id = ${order.id}`;
  }
  return qualification;
}

export async function setState(
  id: string,
  state: OrderState,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await ensureMasterSchema();
  await sql`UPDATE orders SET state = ${state} WHERE id = ${id}`;
  await logEvent(id, "state_change", { state, ...detail });
}

export async function setWorkflow(
  id: string,
  workflowStage: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await ensureMasterSchema();
  await sql`UPDATE orders SET workflow_stage = ${workflowStage} WHERE id = ${id}`;
  await logEvent(id, "workflow", { stage: workflowStage, ...detail });
}

export function jsonb(value: unknown) {
  return sql.json(value as Parameters<typeof sql.json>[0]);
}

export async function logEvent(
  orderId: string,
  kind: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await ensureMasterSchema();
  await sql`
    INSERT INTO order_events (order_id, kind, detail)
    VALUES (${orderId}, ${kind}, ${jsonb(detail)})`;
}

export async function listEvents(orderId: string) {
  await ensureMasterSchema();
  return sql<{ id: number; kind: string; detail: any; created_at: string }[]>`
    SELECT id, kind, detail, created_at FROM order_events
    WHERE order_id = ${orderId} ORDER BY created_at DESC LIMIT 150`;
}

export async function listWorkEvents(limit = 80): Promise<WorkEvent[]> {
  await ensureMasterSchema();
  return sql<WorkEvent[]>`
    SELECT e.id, e.order_id, e.kind, e.detail, e.created_at,
           o.business_name, o.trade, o.workflow_stage, o.state
    FROM order_events e
    JOIN orders o ON o.id = e.order_id
    ORDER BY e.created_at DESC
    LIMIT ${limit}`;
}

export async function listAssets(orderId: string): Promise<ProjectAsset[]> {
  await ensureMasterSchema();
  return sql<ProjectAsset[]>`
    SELECT * FROM project_assets WHERE order_id = ${orderId}
    ORDER BY sort_order ASC, created_at ASC`;
}

export async function getAsset(id: string, orderId?: string): Promise<ProjectAsset | null> {
  await ensureMasterSchema();
  const rows = orderId
    ? await sql<ProjectAsset[]>`SELECT * FROM project_assets WHERE id = ${id} AND order_id = ${orderId}`
    : await sql<ProjectAsset[]>`SELECT * FROM project_assets WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function listVersions(orderId: string) {
  await ensureMasterSchema();
  return sql<{
    id: number; version_no: number; commit_sha: string | null;
    preview_url: string | null; note: string | null; created_at: string;
  }[]>`
    SELECT id, version_no, commit_sha, preview_url, note, created_at
    FROM project_versions WHERE order_id = ${orderId}
    ORDER BY version_no DESC LIMIT 30`;
}

export async function saveVersion(
  orderId: string,
  generated: Record<string, string>,
  commitSha: string | null,
  previewUrl: string | null,
  note: string
): Promise<number> {
  await ensureMasterSchema();
  const [row] = await sql<{ version_no: number }[]>`
    UPDATE orders SET version_no = version_no + 1 WHERE id = ${orderId}
    RETURNING version_no`;
  const version = row?.version_no ?? 1;
  await sql`
    INSERT INTO project_versions (order_id, version_no, generated, commit_sha, preview_url, note)
    VALUES (${orderId}, ${version}, ${jsonb(generated)}, ${commitSha}, ${previewUrl}, ${note})
    ON CONFLICT (order_id, version_no) DO UPDATE SET
      generated = EXCLUDED.generated, commit_sha = EXCLUDED.commit_sha,
      preview_url = EXCLUDED.preview_url, note = EXCLUDED.note`;
  return version;
}

export async function scheduleLeadFollowups(orderId: string): Promise<void> {
  await ensureMasterSchema();
  const order = await getOrder(orderId);
  if (!order?.email || !order.followup_enabled) return;
  const rows = [
    [30, "30m"],
    [24 * 60, "24h"],
    [3 * 24 * 60, "3d"],
  ] as const;
  for (const [minutes, kind] of rows) {
    await sql`
      INSERT INTO followups (order_id, due_at, kind)
      SELECT ${orderId}, now() + (${minutes} * interval '1 minute'), ${kind}
      WHERE NOT EXISTS (
        SELECT 1 FROM followups WHERE order_id = ${orderId} AND kind = ${kind}
      )`;
  }
}

/** "Sharp Cuts Barbers" in Drumcondra -> "sharp-cuts-barbers-drumcondra" */
export function slugify(businessName: string, location: string): string {
  const clean = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const base = [clean(businessName), clean(location)].filter(Boolean).join("-");
  return base.slice(0, 60).replace(/-+$/, "") || "site";
}

export async function uniqueSlug(base: string): Promise<string> {
  await ensureMasterSchema();
  let candidate = base;
  for (let n = 2; n < 100; n++) {
    const [hit] = await sql`SELECT 1 FROM orders WHERE slug = ${candidate} LIMIT 1`;
    if (!hit) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
