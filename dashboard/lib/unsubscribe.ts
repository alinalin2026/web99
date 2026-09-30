import { ensureMasterSchema, getOrder, logEvent, sql } from "./db";

export const UNSUBSCRIBE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function unsubscribeUrlFor(orderId: string): string {
  return `${(process.env.APP_URL ?? "https://web99.ie").replace(/\/+$/, "")}/api/unsubscribe/${orderId}`;
}

/** Stops every further follow-up for this order. Safe to call twice. Returns false for an unknown order. */
export async function unsubscribeOrder(orderId: string): Promise<boolean> {
  if (!UNSUBSCRIBE_UUID.test(orderId)) return false;
  await ensureMasterSchema();
  const order = await getOrder(orderId);
  if (!order) return false;
  if (order.followup_enabled) {
    await sql`UPDATE orders SET followup_enabled = false WHERE id = ${orderId}`;
    await logEvent(orderId, "unsubscribed", { via: "email_link" });
  }
  await sql`UPDATE followups SET status = 'cancelled' WHERE order_id = ${orderId} AND status = 'pending'`;
  return true;
}

export function unsubscribePage(state: "confirm" | "done" | "missing", action: string): string {
  const body =
    state === "confirm"
      ? `<h1>Stop emails about your website?</h1><p>We'll stop the reminder emails. Your website stays saved, and you can still open it from the link in any earlier email.</p><form method="post" action="${action}"><button type="submit">Yes, stop the emails</button></form>`
      : state === "done"
        ? `<h1>Done — no more emails.</h1><p>We won't send you any more reminders about your website. Changed your mind? Just reply to any earlier email and a person will help.</p>`
        : `<h1>We couldn't find that.</h1><p>The link may be incomplete. Reply to the email and we'll take you off the list by hand.</p>`;
  return `<!doctype html><html lang="en-IE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Web99 emails</title><style>body{margin:0;background:#f6f4fe;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#141033}main{max-width:480px;margin:12vh auto;background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 10px 30px rgba(45,27,143,.12)}h1{font-size:1.4rem;margin:0 0 12px}p{line-height:1.6;color:#4c4861}button{background:#5b3fe8;color:#fff;border:0;border-radius:999px;padding:14px 26px;font:inherit;font-weight:700;cursor:pointer;margin-top:8px}</style></head><body><main>${body}</main></body></html>`;
}
