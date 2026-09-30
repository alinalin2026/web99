/* Claude wrapper for Sarah, extraction, planning, Studio and QA.
   Two cost tiers via env: Sarah/extraction are customer-facing and must follow a
   long rigid prompt and emit strict JSON; strategy, copy and QA use the reasoning
   model. All default to Claude Sonnet 5 — move any role up (e.g. claude-opus-5)
   with its ANTHROPIC_*_MODEL variable. */
import { assertNotRefused, createMessage, DEFAULT_MODEL, messageText, normalizeTurns, tokenBudget, type Effort } from "./anthropic";

export type { Effort };

export const MODELS = {
  sarah: process.env.ANTHROPIC_SARAH_MODEL ?? DEFAULT_MODEL,
  extract: process.env.ANTHROPIC_EXTRACT_MODEL ?? DEFAULT_MODEL,
  analyst: process.env.ANTHROPIC_REASONING_MODEL ?? DEFAULT_MODEL,
  studio: process.env.ANTHROPIC_STUDIO_MODEL ?? process.env.ANTHROPIC_REASONING_MODEL ?? DEFAULT_MODEL,
  qa: process.env.ANTHROPIC_QA_MODEL ?? process.env.ANTHROPIC_REASONING_MODEL ?? DEFAULT_MODEL,
} as const;

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_EFFORT = (process.env.ANTHROPIC_DEFAULT_EFFORT as Effort | undefined) ?? "medium";
const SARAH_EFFORT = (process.env.ANTHROPIC_SARAH_EFFORT as Effort | undefined) ?? "low";

async function complete(
  system: string,
  turns: Turn[],
  model: string,
  maxTokens: number,
  effort: Effort = DEFAULT_EFFORT
): Promise<string> {
  const messages = normalizeTurns(turns);
  const request = async (budget: number, instructions: string, level: Effort) => {
    const message = await createMessage({ model, system: instructions, messages, max_tokens: budget, effort: level });
    assertNotRefused(message);
    return { text: messageText(message), truncated: message.stop_reason === "max_tokens" };
  };

  const first = await request(tokenBudget(maxTokens, effort), system, effort);
  // "max_tokens" means the budget ran out — any text is cut off mid-sentence (or
  // mid-JSON) and must not be returned as if it were a real answer.
  if (first.text && !first.truncated) return first.text;

  const retryBudget = Math.min(Math.ceil(tokenBudget(maxTokens, effort) * 1.5) + 4000, 60000);
  const second = await request(
    retryBudget,
    `${system}\n\nIMPORTANT: Produce the requested final answer directly. Do not spend the entire output budget on reasoning.`,
    "low"
  );
  if (second.text && !second.truncated) return second.text;

  throw new Error(`Claude returned ${second.text || first.text ? "truncated text" : "no text"} after automatic retry.`);
}

export async function chat(system: string, turns: Turn[], model: string = MODELS.sarah, effort: Effort = SARAH_EFFORT): Promise<string> {
  // Sarah is a customer-facing intake assistant: keep latency and cost low.
  return complete(system, turns, model, 900, effort);
}

export async function text(
  system: string,
  user: string,
  model: string,
  maxTokens = 12000,
  _temperature?: number,
  effort?: Effort
): Promise<string> {
  return complete(system, [{ role: "user", content: user }], model, maxTokens, effort);
}

export async function json<T = unknown>(
  system: string,
  user: string,
  model: string,
  maxTokens = 16000,
  effort?: Effort
): Promise<T> {
  const jsonSystem = `${system}\n\nIMPORTANT: Return ONLY one valid JSON object. Do not use markdown fences, commentary, or any text before or after the JSON.`;
  const parse = (raw: string): T | null => {
    try { return JSON.parse(raw) as T; } catch { /* fall through to the brace scan */ }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try { return JSON.parse(raw.slice(start, end + 1)) as T; } catch { /* unusable */ }
    }
    return null;
  };

  const raw = await complete(jsonSystem, [{ role: "user", content: user }], model, maxTokens, effort);
  const parsed = parse(raw);
  if (parsed !== null) return parsed;

  // One more attempt with a bigger budget before giving up: a cut-off or
  // fenced reply is far more often a budget problem than a model problem.
  const retry = await complete(jsonSystem, [{ role: "user", content: user }], model, Math.min(maxTokens * 2, 30000), effort);
  const reparsed = parse(retry);
  if (reparsed !== null) return reparsed;
  throw new Error(`Model did not return usable JSON (${retry.length} chars). First 200: ${retry.slice(0, 200)}`);
}
