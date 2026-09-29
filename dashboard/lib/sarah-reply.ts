/* Helpers around Sarah's raw model output and the conversation so far.
   Kept free of Next.js imports so they can be unit-tested with plain node. */

export type QuickReply = { label: string; value: string };

export interface ParsedReply {
  reply: string;
  quickReplies: QuickReply[];
}

const OPTIONS_RE = /\[\[\s*OPTIONS\s*:\s*([^\]]*)\]\]/gi;
const ANY_MARKER_RE = /\[\[[\s\S]*?\]\]/g;
const DANGLING_MARKER_RE = /\[\[[^\]]*$/;

/* The model sometimes improvises markers ("[[PREVIEW pending]]",
   "[[PREVIEW update: {...}]]"). Whatever it writes inside [[ ]] is never for
   the customer, so every marker is removed, not just the two we define. */
export function parseSarahReply(raw: string): ParsedReply {
  let labels: string[] = [];
  for (const match of raw.matchAll(OPTIONS_RE)) {
    labels = match[1]
      .split("|")
      .map((p) => p.trim().replace(/\s+/g, " ").slice(0, 48))
      .filter(Boolean)
      .slice(0, 3);
  }

  const reply = raw
    .replace(ANY_MARKER_RE, "")
    .replace(DANGLING_MARKER_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    reply,
    quickReplies: labels.length >= 2 ? labels.map((label) => ({ label, value: label })) : [],
  };
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/;
const ASKS_PHONE_RE = /phone|number to reach|n[uú]mero|tel[eé]fono|t[eé]l[eé]phone/i;
const ASKS_WHATSAPP_RE = /whats\s?app/i;

export interface ConversationFacts {
  email: string | null;
  phoneGiven: boolean;
  phoneAsked: boolean;
  whatsappAsked: boolean;
  userTurns: number;
}

export interface KnownBrief {
  businessName?: string | null;
  trade?: string | null;
  location?: string | null;
  websiteGoal?: string | null;
  phone?: string | null;
}

export function conversationFacts(turns: { role: "user" | "assistant"; content: string }[]): ConversationFacts {
  let email: string | null = null;
  let phoneGiven = false;
  let phoneAsked = false;
  let whatsappAsked = false;
  let userTurns = 0;
  for (const t of turns) {
    if (t.role === "user") {
      userTurns++;
      if (!email) email = t.content.match(EMAIL_RE)?.[0] ?? null;
      if (PHONE_RE.test(t.content.replace(EMAIL_RE, ""))) phoneGiven = true;
    } else {
      const visible = t.content.replace(ANY_MARKER_RE, "");
      if (/[?？]/.test(visible)) {
        if (ASKS_PHONE_RE.test(visible)) phoneAsked = true;
        if (ASKS_WHATSAPP_RE.test(visible)) whatsappAsked = true;
      }
    }
  }
  return { email, phoneGiven, phoneAsked, whatsappAsked, userTurns };
}

export function hasPhone(text: string): boolean {
  return PHONE_RE.test(text.replace(EMAIL_RE, ""));
}

/* Facts already established, appended to Sarah's system prompt every turn so
   she never re-asks or contradicts them. Only positive facts: what she should
   ask next is decided by sarah-flow.ts, not listed here. */
export function stateBlock(facts: ConversationFacts, brief: KnownBrief | null): string {
  const lines: string[] = [];
  if (facts.email) lines.push(`- Email: given (${facts.email})`);
  if (brief?.businessName) lines.push(`- Business name: ${brief.businessName}`);
  if (brief?.trade) lines.push(`- Kind of business: ${brief.trade}`);
  if (brief?.location) lines.push(`- Location: ${brief.location}`);
  if (brief?.websiteGoal) lines.push(`- What they want the website to do: ${brief.websiteGoal}`);
  if (facts.phoneGiven || brief?.phone) lines.push(`- Phone: given`);
  if (!lines.length) return "";
  return `ALREADY KNOWN (tracked by the system — never ask for any of this again):\n${lines.join("\n")}`;
}
