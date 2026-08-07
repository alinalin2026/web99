import postgres from "postgres";

/* Single connection pool, reused across hot reloads in dev so we don't leak
   connections every time a file changes. */
declare global {
  // eslint-disable-next-line no-var
  var __web99sql: ReturnType<typeof postgres> | undefined;
}

/* Connected on first query rather than on import, so `next build` — which
   loads every route module to collect them — doesn't need a reachable
   database. A missing DATABASE_URL then fails loudly at the first query
   instead of silently at build time. */
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
  created_at: string;
  updated_at: string;
}

export async function getOrder(id: string): Promise<Order | null> {
  const [row] = await sql<Order[]>`SELECT * FROM orders WHERE id = ${id}`;
  return row ?? null;
}

export async function listOrders(state?: OrderState): Promise<Order[]> {
  if (state) {
    return sql<Order[]>`
      SELECT * FROM orders WHERE state = ${state} ORDER BY created_at DESC LIMIT 200`;
  }
  return sql<Order[]>`SELECT * FROM orders ORDER BY created_at DESC LIMIT 200`;
}

/** Counts per state, for the dashboard header. */
export async function stateCounts(): Promise<Record<string, number>> {
  const rows = await sql<{ state: string; n: string }[]>`
    SELECT state, count(*)::text AS n FROM orders GROUP BY state`;
  return Object.fromEntries(rows.map((r) => [r.state, Number(r.n)]));
}

export async function setState(
  id: string,
  state: OrderState,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await sql`UPDATE orders SET state = ${state} WHERE id = ${id}`;
  await logEvent(id, "state_change", { state, ...detail });
}

/* postgres.js types sql.json() against its own JSONValue union, which our
   plain `Record<string, unknown>` payloads don't structurally satisfy even
   though they are valid JSON. One cast, in one place, rather than at every
   call site. */
export function jsonb(value: unknown) {
  return sql.json(value as Parameters<typeof sql.json>[0]);
}

export async function logEvent(
  orderId: string,
  kind: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await sql`
    INSERT INTO order_events (order_id, kind, detail)
    VALUES (${orderId}, ${kind}, ${jsonb(detail)})`;
}

export async function listEvents(orderId: string) {
  return sql<{ id: number; kind: string; detail: any; created_at: string }[]>`
    SELECT id, kind, detail, created_at FROM order_events
    WHERE order_id = ${orderId} ORDER BY created_at DESC LIMIT 100`;
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

/** Slugs are a unique column and also become subdomains, so collisions matter. */
export async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  for (let n = 2; n < 100; n++) {
    const [hit] = await sql`SELECT 1 FROM orders WHERE slug = ${candidate} LIMIT 1`;
    if (!hit) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
