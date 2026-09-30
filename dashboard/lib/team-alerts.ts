/* Sarah promises "someone from the team will email you" for custom requests (an online shop and
   so on) — this is what makes that true: the team gets an email the first time one is captured. */
import { sendCustomEmail } from "./custom-email";
import { jsonb, logEvent, sql, type Order } from "./db";

export function customRequestsOf(brief: Record<string, unknown> | null | undefined): string[] {
  const v = brief?.customRequests;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim().slice(0, 120)).slice(0, 8) : [];
}

export async function alertTeamOfCustomRequest(order: Order): Promise<boolean> {
  const requests = customRequestsOf(order.brief);
  if (!requests.length) return false;
  const already = await sql`SELECT 1 FROM order_events WHERE order_id = ${order.id} AND kind = 'custom_request' LIMIT 1`;
  if (already.length) return false;
  const to = process.env.TEAM_EMAIL ?? process.env.EMAIL_REPLY_TO ?? "hello@web99.ie";
  const base = (process.env.APP_URL ?? "https://web99.ie").replace(/\/+$/, "");
  const name = order.business_name || order.trade || "A new lead";
  await sendCustomEmail(
    to,
    `Custom quote needed: ${name} — ${requests.join(", ").slice(0, 80)}`,
    [
      `${name} asked for something outside the standard €99 website. Sarah told them someone would email them a custom quote.`,
      "",
      `They asked for: ${requests.join("; ")}`,
      `Their email: ${order.email ?? "not given yet"}`,
      `Phone: ${order.phone ?? "not given"}`,
      "",
      `Open it: ${base}/control/orders/${order.id}`,
    ].join("\n"),
    order.id
  );
  await logEvent(order.id, "custom_request", { requests, notified: to });
  return true;
}

/** A request made while chatting about the preview (an online shop, bookings, extra pages…): recorded on the
    brief so the dashboard shows it, and the team is emailed so the "someone will be in touch" promise is kept. */
export async function alertTeamOfChatRequest(order: Order, request: string): Promise<void> {
  const text = request.trim().slice(0, 140);
  if (!text) return;
  const existing = customRequestsOf(order.brief);
  if (existing.some((r) => r.toLowerCase() === text.toLowerCase())) return;
  const requests = [...existing, text].slice(0, 8);
  await sql`UPDATE orders SET brief = coalesce(brief, '{}'::jsonb) || ${jsonb({ customRequests: requests })} WHERE id = ${order.id}`;
  const to = process.env.TEAM_EMAIL ?? process.env.EMAIL_REPLY_TO ?? "hello@web99.ie";
  const base = (process.env.APP_URL ?? "https://web99.ie").replace(/\/+$/, "");
  const name = order.business_name || order.trade || "A lead";
  await sendCustomEmail(
    to,
    `Custom quote needed: ${name} — ${text.slice(0, 80)}`,
    [
      `${name} asked for something outside the standard €99 website while chatting about their preview. Sarah told them someone would email a custom quote.`,
      "",
      `They asked for: ${text}`,
      `Their email: ${order.email ?? "not given yet"}`,
      `Phone: ${order.phone ?? "not given"}`,
      "",
      `Open it: ${base}/control/orders/${order.id}`,
    ].join("\n"),
    order.id
  );
  await logEvent(order.id, "custom_request", { requests: [text], notified: to, via: "preview_chat" });
}
