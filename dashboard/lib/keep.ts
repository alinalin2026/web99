/* "Keep this for me": a customer who likes their preview but isn't paying this second gets an
   emailed link back to it (with the buy bar on the bottom). Shared by the chat button (JSON) and
   the new-tab page's form. Public, so it is bounded: the order's unguessable id is required, the
   site must exist, the email goes to the address we already hold (a typed one is only accepted
   when we hold none), and each order can be sent at most a few times, not more than once a minute. */
import { getOrder, logEvent, sql } from "./db";
import { savedForLater, send } from "./email";
import { createLimiter } from "./ratelimit";
import { fixNavigation, siteProblems } from "./instant-site";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const MAX_PER_ORDER = 5;
const MIN_GAP_MS = 60_000;
const MAX_PER_ADDRESS_PER_DAY = 3;
const ipLimit = createLimiter(10, 3_600_000);

export type KeepResult =
  | { status: "sent"; maskedEmail: string }
  | { status: "throttled"; maskedEmail: string }
  | { status: "rate_limited" }
  | { status: "need_email" | "invalid_email" | "not_found" | "no_site" | "failed" };

export function maskEmail(email: string): string {
  const [user, domain = ""] = email.split("@");
  return `${user.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(user.length - 1, 6)))}@${domain}`;
}

export function siteUrlFor(orderId: string): string {
  return `${(process.env.APP_URL ?? "https://web99.ie").replace(/\/+$/, "")}/api/instant-site/view/${orderId}`;
}

export async function keepForLater(orderId: string, typedEmail?: string | null, ip = "unknown"): Promise<KeepResult> {
  if (!UUID.test(orderId)) return { status: "not_found" };
  if (!ipLimit.allow(ip)) return { status: "rate_limited" };
  const order = await getOrder(orderId);
  if (!order) return { status: "not_found" };

  const built = await sql<{ html: string }[]>`
    SELECT detail->>'html' AS html FROM order_events
    WHERE order_id = ${orderId} AND kind = 'instant_site' AND detail ? 'html' ORDER BY created_at DESC LIMIT 1`;
  // Never email a link to a page the view route would refuse to show.
  if (!built[0]?.html || siteProblems(fixNavigation(built[0].html)).length) return { status: "no_site" };

  let to = order.email;
  if (!to) {
    const typed = (typedEmail ?? "").trim();
    if (!typed) return { status: "need_email" };
    if (!EMAIL.test(typed)) return { status: "invalid_email" };
    to = typed;
  }

  const prior = await sql<{ created_at: string }[]>`
    SELECT created_at FROM order_events WHERE order_id = ${orderId} AND kind = 'saved_for_later' ORDER BY created_at DESC LIMIT ${MAX_PER_ORDER}`;
  if (prior.length && Date.now() - new Date(prior[0].created_at).getTime() < MIN_GAP_MS) return { status: "throttled", maskedEmail: maskEmail(to) };
  if (prior.length >= MAX_PER_ORDER) return { status: "throttled", maskedEmail: maskEmail(to) };

  // One address can't be flooded through many orders either.
  const perAddress = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM order_events
    WHERE kind = 'saved_for_later' AND lower(detail->>'email') = ${to.toLowerCase()} AND created_at > now() - interval '24 hours'`;
  if (Number(perAddress[0]?.n ?? 0) >= MAX_PER_ADDRESS_PER_DAY) return { status: "throttled", maskedEmail: maskEmail(to) };

  try {
    if (!order.email) await sql`UPDATE orders SET email = ${to} WHERE id = ${orderId} AND email IS NULL`;
    const messageId = await send(to, savedForLater("", order.business_name || "your business", siteUrlFor(orderId)), orderId);
    await logEvent(orderId, "saved_for_later", { email: to, messageId });
    return { status: "sent", maskedEmail: maskEmail(to) };
  } catch (err) {
    console.error("keep-for-later email failed", (err as Error).message);
    try { await logEvent(orderId, "error", { step: "saved_for_later", message: (err as Error).message }); } catch { /* best effort */ }
    return { status: "failed" };
  }
}
