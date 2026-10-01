/* The "Do you like it?" bar shown on the standalone new-tab view of a customer's site. Inline
   styles and a plain link only — the page is served under a CSP with no scripts, and the bar is
   added at serve time so the saved HTML stays untouched. */
import { commercials } from "./capabilities";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function withPreviewBar(html: string, orderId: string): string {
  if (!UUID.test(orderId)) throw new Error("withPreviewBar needs an order UUID.");
  const bar =
    `<style>body{padding-bottom:96px !important}.dock{display:none !important}` +
    `.w99bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:center;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:#17152b;color:#fff;font:600 15px/1.3 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;box-shadow:0 -8px 30px rgba(0,0,0,.28)}` +
    `.w99bar-sub{opacity:.75;font-weight:500}` +
    `.w99bar a{background:#5b3fe8;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:800;white-space:nowrap}` +
    `.w99bar a.w99keep{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.45);padding:10px 20px;font-weight:700}` +
    `@media(max-width:560px){.w99bar-sub{display:none}.w99bar{gap:8px 12px;padding-top:10px}body{padding-bottom:84px !important}}</style>` +
    `<div class="w99bar"><span>This is your Web99 preview. <b style="font-weight:800">Do you like it?</b> <span class="w99bar-sub">${commercials.price} &mdash; website, domain &amp; hosting for the first year</span></span>` +
    `<a href="/buy/${orderId}">Yes, I love it &mdash; get it live</a>` +
    `<a class="w99keep" href="/start/?site=${orderId}">Chat about it</a></div>`;
  const at = html.toLowerCase().lastIndexOf("</body>");
  return at === -1 ? html + bar : html.slice(0, at) + bar + html.slice(at);
}
