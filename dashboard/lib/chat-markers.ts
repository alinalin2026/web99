/* Sarah talks to the website through two short markers at the end of a reply:

     [[PREVIEW: {"businessName":"…","trade":"…",…}]]   — build / update the live preview
     [[OPTIONS: One | Two | Three]]                     — tappable quick-reply buttons

   Both are stripped before the customer sees the message. Kept in its own file
   (no Next.js imports) so it can be unit-tested. */

import { normaliseStyle, type StyleId } from "./image-library";

export type QuickReply = { label: string; value: string };

export interface PreviewBrief {
  businessName: string;
  trade: string;
  description: string;
  location?: string;
  style: StyleId;
  language?: string;
}

export const MAX_QUICK_REPLIES = 4;

const PREVIEW_RE = /\[\[\s*PREVIEW:\s*(\{[\s\S]*?\})\s*\]\]/i;
const OPTIONS_RE = /\s*\[\[\s*OPTIONS:\s*([^\]]+)\]\]\s*$/i;

const clip = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export function parsePreviewMarker(raw: string): { rest: string; preview: PreviewBrief | null } {
  const match = raw.match(PREVIEW_RE);
  if (!match) return { rest: raw, preview: null };
  const rest = raw.replace(PREVIEW_RE, "").replace(/\n{3,}/g, "\n\n");

  try {
    const data = JSON.parse(match[1]) as Record<string, unknown>;
    const trade = clip(data.trade, 120);
    if (!trade) return { rest, preview: null };
    const location = clip(data.location, 120);
    const language = clip(data.language, 40);
    return {
      rest,
      preview: {
        businessName: clip(data.businessName, 120) || "Your Business",
        trade,
        description: clip(data.description, 600) || trade,
        ...(location ? { location } : {}),
        style: normaliseStyle(data.style),
        ...(language ? { language } : {}),
      },
    };
  } catch {
    return { rest, preview: null };
  }
}

export function parseSarahReply(raw: string): {
  reply: string;
  quickReplies: QuickReply[];
  preview: PreviewBrief | null;
} {
  const { rest, preview } = parsePreviewMarker(raw);
  const match = rest.match(OPTIONS_RE);
  if (!match) return { reply: rest.trim(), quickReplies: [], preview };

  const labels = match[1]
    .split("|")
    .map((p) => p.trim().replace(/\s+/g, " ").slice(0, 40))
    .filter(Boolean)
    .slice(0, MAX_QUICK_REPLIES);
  const reply = rest.replace(OPTIONS_RE, "").trim();
  if (labels.length < 2) return { reply, quickReplies: [], preview };
  return { reply, quickReplies: labels.map((label) => ({ label, value: label })), preview };
}
