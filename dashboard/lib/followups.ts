/* Follow-up emails for someone who has SEEN their website but hasn't bought.

   Two nudges, both anchored to when their site was first built (not to each other, so a late send never
   drifts the next one): site_24h and site_3d. Then we stop. The rules below decide, for each due nudge,
   whether to send it, cancel it for good, or hold it until a better moment. Pure functions, so they can be
   tested without a database or a clock. */

export const SITE_KINDS = ["site_24h", "site_3d"] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

/* Delay from the moment the site was first built. */
export const SITE_DELAY_MINUTES: Record<SiteKind, number> = { site_24h: 24 * 60, site_3d: 3 * 24 * 60 };

/* Short tag put on the email's link (?src=) so the funnel can show who came back because of which nudge. */
export const SITE_SRC: Record<SiteKind, string> = { site_24h: "f24", site_3d: "f3d" };

/* The old lead sequence ("We may already have enough to make a first demo…") predates the instant site —
   the site is shown straight away now — and was never sent (nothing ran the cron). It is retired. */
export const LEGACY_LEAD_KINDS = new Set(["30m", "24h", "3d"]);

export const isSiteKind = (k: string): k is SiteKind => (SITE_KINDS as readonly string[]).includes(k);

/* A nudge that is this overdue (server was down, job stuck) is no longer useful — drop it rather than send late. */
export const MAX_OVERDUE_MS = 36 * 3600 * 1000;
/* If they opened their workspace or chatted with Sarah this recently they're engaged: don't nudge them mid-visit. */
export const ACTIVE_WINDOW_HOURS = 12;

export function dublinHour(at: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Dublin" }).format(at);
  return Number(h);
}

/* Nobody wants a sales email at 3am: only send between 08:00 and 20:00 Dublin time. */
export const inSendWindow = (at: Date = new Date()): boolean => {
  const h = dublinHour(at);
  return h >= 8 && h < 20;
};

export interface DueFollowup {
  kind: string;
  dueAt: Date | string;
  email: string | null;
  followupEnabled: boolean;
  state: string;
  paid: boolean;
  hasReply: boolean;
  recentlyActive: boolean;
}

export type Decision = { action: "send" } | { action: "cancel"; reason: string } | { action: "wait"; reason: string };

export function decideSiteFollowup(row: DueFollowup, now: Date = new Date()): Decision {
  if (!row.email) return { action: "cancel", reason: "no email address" };
  if (!row.followupEnabled) return { action: "cancel", reason: "unsubscribed" };
  if (row.paid || row.state === "won") return { action: "cancel", reason: "already bought" };
  if (row.state === "lost") return { action: "cancel", reason: "closed as lost" };
  if (row.hasReply) return { action: "cancel", reason: "they replied — a person takes it from here" };
  if (now.getTime() - new Date(row.dueAt).getTime() > MAX_OVERDUE_MS) return { action: "cancel", reason: "too late to be useful" };
  if (!inSendWindow(now)) return { action: "wait", reason: "outside 08:00–20:00 Dublin" };
  if (row.recentlyActive) return { action: "wait", reason: "they are active right now" };
  return { action: "send" };
}
