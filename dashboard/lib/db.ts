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
  conversation: {
    role: "user" | "assistant"; content: string; at: string;
    attachments?: { id: string; filename: string; mimeType: string; size: number }[];
  }[];
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

export interface ChatAttachment {
  id: string; order_id: string; filename: string; mime_type: string;
  size_bytes: number; storage_path: string; created_at: string;
}

export async function insertAttachment(input: {
  orderId: string; filename: string; mimeType: string; sizeBytes: number; storagePath: string;
}): Promise<ChatAttachment> {
  await ensureMasterSchema();
  const [row] = await sql<ChatAttachment[]>`
    INSERT INTO chat_attachments (order_id, filename, mime_type, size_bytes, storage_path)
    VALUES (${input.orderId}, ${input.filename}, ${input.mimeType}, ${input.sizeBytes}, ${input.storagePath})
    RETURNING *`;
  return row;
}

export async function getAttachment(id: string): Promise<ChatAttachment | null> {
  await ensureMasterSchema();
  const rows = await sql<ChatAttachment[]>`SELECT * FROM chat_attachments WHERE id = ${id}`;
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

/** Same table/mechanism as scheduleLeadFollowups, but for the other side of
    the funnel: a lead who has actually been sent their preview and gone
    quiet, rather than one who never finished the chat. Call once, right
    when the preview is sent. due_at is fixed relative to that moment
    (24h/36h/48h) rather than chained off each other, so a late or failed
    send of one nudge never drifts the next one's timing. */
export async function schedulePreviewFollowups(orderId: string): Promise<void> {
  await ensureMasterSchema();
  const order = await getOrder(orderId);
  if (!order?.email || !order.followup_enabled) return;
  const rows = [
    [24 * 60, "preview_24h"],
    [36 * 60, "preview_36h"],
    [48 * 60, "preview_48h"],
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

/* ===========================================================================
   CUSTOMER INBOX
   ---------------------------------------------------------------------------
   Threading follows the standard Message-ID / In-Reply-To / References
   headers (RFC 5322). thread_id is derived, never sent by email clients:
   if an inbound or outbound email's In-Reply-To matches a message we've
   already stored, it joins that message's thread; otherwise (or if the
   References chain matches something we've stored but In-Reply-To didn't)
   it starts a new one.
   =========================================================================== */

export interface EmailRow {
  id: number;
  order_id: string | null;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email: string;
  subject: string;
  html: string | null;
  text_body: string | null;
  message_id: string;
  in_reply_to: string | null;
  refs: string | null;
  thread_id: string;
  resend_id: string | null;
  read_at: string | null;
  created_at: string;
}

/** Best-effort match of a raw address (possibly "Name <addr>") to an order. */
export async function findOrderIdByEmail(rawAddress: string): Promise<string | null> {
  await ensureMasterSchema();
  const match = rawAddress.match(/<([^>]+)>/);
  const address = (match ? match[1] : rawAddress).trim().toLowerCase();
  if (!address) return null;
  const [row] = await sql<{ id: string }[]>`
    SELECT id FROM orders WHERE lower(email) = ${address} ORDER BY updated_at DESC LIMIT 1`;
  return row?.id ?? null;
}

/** Reuses an existing thread when In-Reply-To or any References entry is
    already known to us; otherwise starts a new thread. */
export async function resolveThreadId(inReplyTo: string | null, refs: string | null): Promise<string> {
  await ensureMasterSchema();
  const candidates = [inReplyTo, ...(refs ? refs.split(/\s+/) : [])].filter(Boolean) as string[];
  for (const messageId of candidates) {
    const [row] = await sql<{ thread_id: string }[]>`
      SELECT thread_id FROM emails WHERE message_id = ${messageId} LIMIT 1`;
    if (row) return row.thread_id;
  }
  return crypto.randomUUID();
}

/** Idempotent on message_id — safe for Resend's at-least-once webhook delivery. */
export async function insertEmail(row: {
  order_id: string | null;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email: string;
  subject: string;
  html: string | null;
  text_body: string | null;
  message_id: string;
  in_reply_to: string | null;
  refs: string | null;
  thread_id: string;
  resend_id: string | null;
}): Promise<EmailRow | null> {
  await ensureMasterSchema();
  const [inserted] = await sql<EmailRow[]>`
    INSERT INTO emails (order_id, direction, from_email, to_email, subject, html, text_body,
                         message_id, in_reply_to, refs, thread_id, resend_id, read_at)
    VALUES (${row.order_id}, ${row.direction}, ${row.from_email}, ${row.to_email}, ${row.subject},
            ${row.html}, ${row.text_body}, ${row.message_id}, ${row.in_reply_to}, ${row.refs},
            ${row.thread_id}, ${row.resend_id}, ${row.direction === "outbound" ? sql`now()` : null})
    ON CONFLICT (message_id) DO NOTHING
    RETURNING *`;
  return inserted ?? null;
}

export interface ThreadSummary {
  thread_id: string;
  subject: string;
  from_email: string;
  to_email: string;
  preview: string;
  last_at: string;
  unread: number;
}

export async function listThreadsForOrder(orderId: string): Promise<ThreadSummary[]> {
  await ensureMasterSchema();
  return sql<ThreadSummary[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (thread_id)
        thread_id, subject, from_email, to_email,
        left(coalesce(text_body, regexp_replace(coalesce(html, ''), '<[^>]+>', ' ', 'g')), 180) AS preview,
        created_at AS last_at,
        (SELECT count(*)::int FROM emails e2
           WHERE e2.thread_id = emails.thread_id AND e2.direction = 'inbound' AND e2.read_at IS NULL) AS unread
      FROM emails
      WHERE order_id = ${orderId}
      ORDER BY thread_id, created_at DESC
    ) t
    ORDER BY last_at DESC`;
}

export async function listEmailsInThread(orderId: string, threadId: string): Promise<EmailRow[]> {
  await ensureMasterSchema();
  return sql<EmailRow[]>`
    SELECT * FROM emails WHERE order_id = ${orderId} AND thread_id = ${threadId}
    ORDER BY created_at ASC`;
}

export async function markThreadRead(orderId: string, threadId: string): Promise<void> {
  await ensureMasterSchema();
  await sql`
    UPDATE emails SET read_at = now()
    WHERE order_id = ${orderId} AND thread_id = ${threadId} AND direction = 'inbound' AND read_at IS NULL`;
}

export async function getEmail(id: number): Promise<EmailRow | null> {
  await ensureMasterSchema();
  const [row] = await sql<EmailRow[]>`SELECT * FROM emails WHERE id = ${id}`;
  return row ?? null;
}

export interface EmailAttachmentRow {
  id: string; email_id: number; filename: string; mime_type: string;
  size_bytes: number; storage_path: string; created_at: string;
}

export async function insertEmailAttachment(input: {
  emailId: number; filename: string; mimeType: string; sizeBytes: number; storagePath: string;
}): Promise<EmailAttachmentRow> {
  await ensureMasterSchema();
  const [row] = await sql<EmailAttachmentRow[]>`
    INSERT INTO email_attachments (email_id, filename, mime_type, size_bytes, storage_path)
    VALUES (${input.emailId}, ${input.filename}, ${input.mimeType}, ${input.sizeBytes}, ${input.storagePath})
    RETURNING *`;
  return row;
}

export async function listEmailAttachments(emailId: number): Promise<EmailAttachmentRow[]> {
  await ensureMasterSchema();
  return sql<EmailAttachmentRow[]>`
    SELECT * FROM email_attachments WHERE email_id = ${emailId} ORDER BY created_at ASC`;
}

export async function listEmailAttachmentsForThread(emailIds: number[]): Promise<EmailAttachmentRow[]> {
  await ensureMasterSchema();
  if (emailIds.length === 0) return [];
  return sql<EmailAttachmentRow[]>`
    SELECT * FROM email_attachments WHERE email_id IN ${sql(emailIds)} ORDER BY created_at ASC`;
}

export async function getEmailAttachment(id: string): Promise<EmailAttachmentRow | null> {
  await ensureMasterSchema();
  const [row] = await sql<EmailAttachmentRow[]>`SELECT * FROM email_attachments WHERE id = ${id}`;
  return row ?? null;
}
