/* Sarah's pre-purchase conversation as an explicit little state machine.

   The language model is good at warmth and languages and bad at bookkeeping:
   left to follow a ten-step script from a long prompt it asked for the same
   email three times, skipped steps and improvised. So the code decides WHICH
   step this turn is; the model only writes that one step, in the customer's
   language. Pure functions, no Next.js imports, unit-tested. */

import { hasPhone, type ConversationFacts } from "./sarah-reply";

export type Step = "name" | "email" | "describe" | "confirm" | "contact" | "whatsapp" | "close";

export const MAX_CONFIRMS = 3;

export interface FlowTurn {
  role: "user" | "assistant";
  content: string;
  step?: Step;
  options?: string[];
}

/** The step Sarah asked last. No assistant turn yet means the opener (business name) is what was asked. */
export function lastAssistantStep(history: FlowTurn[]): Step {
  const last = [...history].reverse().find((t) => t.role === "assistant");
  if (!last) return "name";
  // Conversations saved before steps existed: treat them as mid-conversation.
  return last.step ?? "describe";
}

export function confirmCount(history: FlowTurn[]): number {
  return history.filter((t) => t.role === "assistant" && t.step === "confirm").length;
}

export interface DecideInput {
  prev: Step;
  facts: ConversationFacts;
  /** Only meaningful when prev === "confirm": did the customer say they have nothing more to add? */
  finished: boolean;
  confirms: number;
  latest: string;
}

export function decideStep(i: DecideInput): Step {
  switch (i.prev) {
    case "name":
      return i.facts.email ? "describe" : "email";
    case "email":
      return "describe";
    case "describe":
      return "confirm";
    case "confirm": {
      if (!i.finished && i.confirms < MAX_CONFIRMS) return "confirm";
      const needsContact = !i.facts.email || (!i.facts.phoneGiven && !i.facts.phoneAsked);
      return needsContact ? "contact" : "close";
    }
    case "contact":
      return hasPhone(i.latest) && !i.facts.whatsappAsked ? "whatsapp" : "close";
    case "whatsapp":
    case "close":
      return "close";
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

/** Cheap answers that need no model call: a tap on one of the buttons Sarah offered, or a long message (which is adding detail). */
export function quickFinished(latest: string, options: string[] | undefined): boolean | null {
  const l = norm(latest);
  if (options?.length) {
    const idx = options.findIndex((o) => norm(o) === l);
    if (idx === 0) return true;
    if (idx > 0) return false;
  }
  if (l.split(" ").filter(Boolean).length >= 12) return false;
  return null;
}

export const FINISHED_CLASSIFIER = `Sarah, a website-design assistant, has just asked a small-business owner whether that is everything they want to tell her or whether they would like to add something.
Decide from the owner's reply whether they have NOTHING MORE to add (for example "that's all", "no", "nope", "grand", "that's it", "eso es todo", "c'est tout", a thumbs-up, or thanks with no new information), or whether they ARE adding or asking something (new details, a request, a question).
The reply may be in any language.
Return ONLY this JSON: {"finished": true|false}`;

/* --- what the model is asked to do this turn --------------------------------- */

const COMMON = `Whatever the customer just said: if it contained a question or something off-topic, answer it in ONE short, truthful sentence using only the facts you were given (if you are not sure, say it will be confirmed before anything is charged), and then still do this turn's job below. Never mention steps, stages or "the next question".`;

const KIND_GUIDE = `To choose suggestions, silently think about what kind of business this is (never say the category aloud): emergency trades (plumber, electrician, locksmith) live or die on how fast people can reach them; appointment trades (barber, dentist, nails) on booking, hours and prices; hospitality and shops on hours, location and what they sell; considered purchases (solicitor, accountant, builder) on credibility and how a conversation starts; product sellers on the products themselves.`;

export function stepDirective(step: Step, ctx: { confirms: number; hasEmail: boolean }): string {
  const job = (() => {
    switch (step) {
      case "name":
        return `The customer's message is their business name (or a greeting). Greet them warmly in one short sentence and ask what their business is called. If they already told you, treat it as the name.`;
      case "email":
        return `Their last message was their business name (or a statement that they do not have one yet — accept that gracefully and never ask for a name again). Acknowledge it in a few words. Then ask, in one short question, what email address the preview should be sent to. Nothing else: no suggestions, no other questions, no buttons.`;
      case "describe":
        return `${ctx.hasEmail ? "They have given their email: thank them briefly (do not repeat the address back at length). " : "Do NOT mention email at all in this message and do not ask for it. "}Then invite them, in one short question, to describe in their own words what the business does and what they would like the website to do. If their last message already described the business, acknowledge that in a few words and ask only what they want the website to do for them. No buttons.`;
      case "confirm":
        return `${ctx.confirms > 0 ? "They have added something. Acknowledge it in a few words, do not repeat earlier suggestions, and ask the closing question again. " : "In one sentence, reflect back what you understood about the business and what the website needs to do. Then give ONE or TWO short suggestions that genuinely fit this kind of business, clearly framed as suggestions. "}${KIND_GUIDE} Finish by asking whether that is all or whether there is anything else they would like to add, and end the message with a translated options marker on its own final line, for example in English: [[OPTIONS: That's all | Add something]]. Do not ask any other question. Never ask for their email, phone number or opening hours here.`;
      case "contact":
        return ctx.hasEmail
          ? `Ask ONE short question: could they leave a phone number, in case that is easier than email? Say it is optional and fine to skip. No buttons.`
          : `You still have no email address for them. Ask ONE short question for the best email to send their preview link to, so they can find it again — a phone number is fine instead. Accept whatever they say. No buttons.`;
      case "whatsapp":
        return `They gave a phone number. Thank them and ask ONE short question: would they like to be contacted on WhatsApp as well as email? End with a translated options marker on its own final line, for example in English: [[OPTIONS: Yes, WhatsApp too | Email only]].`;
      case "close":
        return `This is the final message. Thank them in a few words, then tell them: a first look at their website's design is building right now, just below the chat on this page, and takes a minute or two; it shows the look and feel (their own photos and details go in after they decide); no card is needed and nothing has been charged. Ask no question and add no buttons. If they have written again after that, answer briefly and remind them the preview is just below.`;
    }
  })();
  return `THIS TURN'S JOB (the ONLY thing to do in this reply):\n${job}\n\n${COMMON}\nAsk at most one question. Reply in 1–3 short sentences${step === "confirm" ? " plus the options marker" : ""}.`;
}
