/* "Let's chat about it": a second Sarah conversation, about the customer's generated preview.

   She can answer questions, take feedback and APPLY changes to the preview while they watch: edits to the
   copy, contact details the customer gives, a different look, a different photo set. Every change goes
   through the same validation and renderer as a normal build (parseSiteContent + renderSite), so a chat
   edit can never produce a broken or unsafe page. Anything outside the standard website (a shop, extra
   features, a custom request) is routed to the team for a custom quote instead. */
import { createMessage, assertNotRefused, DEFAULT_MODEL, messageText, tokenBudget, type Effort } from "./anthropic";
import { commercials } from "./capabilities";
import { STYLE_KEYS, type LibraryTrade, type StyleKey } from "./instant-site";
import { parseSiteContent, type SiteContent } from "./site-blocks";

export interface ChatTurn { role: "user" | "assistant"; content: string }

export interface PreviewChatResult {
  reply: string;
  edits: Record<string, unknown> | null;
  look: StyleKey | null;
  photoFolder: string | null;
  needsTeam: string | null;
  readyToBuy: boolean;
}

const EDITABLE = ["brand", "hero", "services", "values", "process", "about", "faq", "cta", "contact", "footer"] as const;

export function previewChatSystem(content: SiteContent, library: LibraryTrade[]): string {
  const { palette: _p, photoFolder: _f, ...copy } = content;
  void _p; void _f;
  const folders = library.map((t) => `${t.key} (${t.label})`).join(", ");
  return `You are Sarah, the AI assistant for Web99.ie, a small web design studio in Dublin. A small-business owner is looking at the website preview we generated for them and is chatting with you about it.

YOUR JOB
Help them get the preview to a point where they feel good about it. Answer questions, listen to feedback, and MAKE THE CHANGES THEY ASK FOR — the preview updates while they watch. Be warm, plain-spoken and brief (2-4 short sentences, Irish-English). Ask at most one question at a time. Never pressure them to buy: if they hesitate, reassure honestly (they pay nothing to look or to ask for changes; they only pay if they love it). When they sound ready, invite them to tap the "Yes, I love it" button.

WHAT YOU CAN CHANGE (put it in the JSON, never just say you did it)
- Copy: edit any words in the current copy below (headline, sub-headline, services, FAQ, about text, call-to-action, business name, tagline, footer). Put ONLY the sections you change in "edits", using exactly the same shape as the current copy. When you change any list (services.items, values.items, process.steps, faq.items, about.paragraphs/bullets, hero.chips) include the WHOLE list. Keep icon names as they are (or pick another valid icon name) and keep the same field names.
- Contact details: if they give a phone number, email, address or opening hours, set them in edits.contact. Only what they explicitly tell you — never guess.
- The look: set "look" to one of ${STYLE_KEYS.join(", ")} to re-style the whole page (lighter = bright and airy, darker = dark premium, bolder = high-contrast and energetic, softer = warm and gentle, photos = more photographic). Use it when they say things like "too dark", "more modern", "more colour", "softer".
- The photos: set "photoFolder" to one of these folder keys to swap the photo set: ${folders || "(none)"}.

WHAT YOU CANNOT DO (be honest, never promise)
- Their own logo and photos: after they order, they send these in one short checklist and we add them — say so. You can't place them in the preview.
- Extra pages, an online shop, bookings, logins, special features or anything outside the standard one-page website: say yes, we can take that on as a custom job with its own quote, and set "needsTeam" to a few words describing it; someone from the team will email them. Never name a price or range for it.
- Never invent facts: no prices, years in business, staff counts, awards, insurance, testimonials, statistics, opening hours, phone numbers, emails or addresses they did not tell you. No business email is offered.

THE OFFER (only ever state this)
${commercials.price} once: a complete website, their own domain and hosting for the first year, and 30 social media posts (three months of Facebook posts). Setting up a Facebook page is €49 extra. Changes to this preview are free and unlimited until they buy. After they pay they send their photos, logo and details in one checklist and the finished site is live within 5 business days; ${commercials.freeChanges} free change rounds follow. Renewal after year one: ${commercials.renewal}. A person checks the finished website before it goes live.

CURRENT COPY OF THE PREVIEW (JSON):
${JSON.stringify(copy)}

OUTPUT — reply with ONE JSON object and nothing else:
{"reply": "what you say to them", "edits": null or {partial copy}, "look": null or one of ${STYLE_KEYS.join("|")}, "photoFolder": null or "folder-key", "needsTeam": null or "few words", "readyToBuy": true|false}
"reply" must say briefly what you changed, if anything. "readyToBuy" is true only when they clearly signal they want to go ahead.`;
}

/** Tolerant parse of the model's answer: a plain-text reply (no JSON) still works, just with no changes. */
export function parsePreviewReply(text: string): PreviewChatResult {
  const fallback: PreviewChatResult = { reply: "", edits: null, look: null, photoFolder: null, needsTeam: null, readyToBuy: false };
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const j = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const reply = typeof j.reply === "string" ? j.reply.trim().slice(0, 1200) : "";
      if (reply) {
        const edits = j.edits && typeof j.edits === "object" && !Array.isArray(j.edits) ? (j.edits as Record<string, unknown>) : null;
        return {
          reply,
          edits,
          look: typeof j.look === "string" && (STYLE_KEYS as string[]).includes(j.look) ? (j.look as StyleKey) : null,
          photoFolder: typeof j.photoFolder === "string" && j.photoFolder ? j.photoFolder : null,
          needsTeam: typeof j.needsTeam === "string" && j.needsTeam.trim() ? j.needsTeam.trim().slice(0, 140) : null,
          readyToBuy: j.readyToBuy === true,
        };
      }
    } catch { /* fall through to plain text */ }
  }
  fallback.reply = text.replace(/[{}]/g, "").trim().slice(0, 1200);
  return fallback;
}

/** Merge a partial edit into the copy (objects merge one level deep, lists are replaced) and re-validate it. */
export function applyEdits(content: SiteContent, edits: Record<string, unknown>, folders: string[]): SiteContent {
  const merged: Record<string, unknown> = { ...content };
  for (const key of EDITABLE) {
    const patch = edits[key];
    if (patch && typeof patch === "object" && !Array.isArray(patch)) merged[key] = { ...(content[key] as object), ...(patch as object) };
  }
  // photoFolder and palette are chosen separately, never via free-form edits.
  return parseSiteContent(JSON.stringify(merged), { folders });
}

export async function askSarahAboutPreview(args: {
  content: SiteContent;
  library: LibraryTrade[];
  history: ChatTurn[];
  message: string;
  signal?: AbortSignal;
}): Promise<PreviewChatResult> {
  const effort = (process.env.ANTHROPIC_SARAH_EFFORT as Effort | undefined) ?? "low";
  const turns = [...args.history.slice(-10), { role: "user" as const, content: args.message }];
  const message = await createMessage(
    {
      model: process.env.ANTHROPIC_SARAH_MODEL ?? DEFAULT_MODEL,
      system: previewChatSystem(args.content, args.library),
      messages: turns,
      max_tokens: tokenBudget(4000, effort),
      effort,
    },
    { signal: args.signal }
  );
  assertNotRefused(message);
  return parsePreviewReply(messageText(message));
}
