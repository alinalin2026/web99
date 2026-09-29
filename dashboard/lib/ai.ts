/* OpenAI wrapper for Sarah, extraction, planning, Studio and QA.
   One provider, two cost tiers: a fast model for intake/extraction and a
   stronger reasoning model for strategy, copy, QA and orchestration. */

const RESPONSES_URL = "https://api.openai.com/v1/responses";

/* Sarah and the brief extractor are customer-facing and must follow a long
   rigid prompt and emit strict JSON, so they get their own settings instead of
   sharing OPENAI_FAST_MODEL — that one is a cost knob and was set to gpt-5-nano,
   which drifted off-script and returned truncated JSON. */
export const MODELS = {
  sarah: process.env.OPENAI_SARAH_MODEL ?? "gpt-5-mini",
  extract: process.env.OPENAI_EXTRACT_MODEL ?? "gpt-5-mini",
  analyst: process.env.OPENAI_REASONING_MODEL ?? "gpt-5.1",
  studio: process.env.OPENAI_STUDIO_MODEL ?? process.env.OPENAI_REASONING_MODEL ?? "gpt-5.1",
  qa: process.env.OPENAI_QA_MODEL ?? process.env.OPENAI_REASONING_MODEL ?? "gpt-5.1",
} as const;

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

function apiKey(): string {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) throw new Error("OPENAI_API_KEY is not set.");
  if (value.startsWith("sk-ant-")) throw new Error("OPENAI_API_KEY contains an Anthropic key. Replace it with an OpenAI API key.");
  return value;
}

function outputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const block of item?.content ?? []) {
      if (block?.type === "output_text" && typeof block.text === "string") parts.push(block.text);
    }
  }
  return parts.join("").trim();
}

async function requestCompletion(
  system: string,
  turns: Turn[],
  model: string,
  maxTokens: number,
  retry = false,
  reasoningEffort?: "minimal" | "low" | "medium" | "high"
): Promise<{ data: any; raw: string; status: number }> {
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: retry
        ? `${system}\n\nIMPORTANT: Produce the requested final answer directly. Do not spend the entire output budget on internal reasoning.`
        : system,
      input: turns.map((turn) => ({ role: turn.role, content: turn.content })),
      max_output_tokens: maxTokens,
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    }),
  });

  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error(`OpenAI returned invalid JSON (HTTP ${response.status}): ${raw.slice(0, 300)}`); }

  if (!response.ok) {
    const message = data?.error?.message ?? raw.slice(0, 500) ?? "Unknown OpenAI API error";
    throw new Error(`OpenAI API ${response.status}: ${message}`);
  }

  return { data, raw, status: response.status };
}

async function complete(
  system: string,
  turns: Turn[],
  model: string,
  maxTokens: number,
  _temperature?: number,
  reasoningEffort?: "minimal" | "low" | "medium" | "high"
): Promise<string> {
  const first = await requestCompletion(system, turns, model, maxTokens, false, reasoningEffort);
  const firstText = outputText(first.data);
  const firstStatus = String(first.data?.status ?? "");
  const reason = String(first.data?.incomplete_details?.reason ?? "");
  const refusal = (first.data?.output ?? [])
    .flatMap((item: any) => item?.content ?? [])
    .find((block: any) => block?.type === "refusal")?.refusal;
  if (refusal) throw new Error(`OpenAI refused the request: ${String(refusal).slice(0, 500)}`);

  // "incomplete" means max_output_tokens ran out. Any text that came back is
  // cut off mid-sentence (or mid-JSON), so it must not be returned as if it
  // were a real answer — retry once with a larger budget instead.
  if (firstText && firstStatus !== "incomplete") return firstText;

  const retryTokens = Math.min(Math.max(maxTokens + 4000, Math.ceil(maxTokens * 1.5)), 30000);
  const second = await requestCompletion(system, turns, model, retryTokens, true, reasoningEffort === undefined ? undefined : "minimal");
  const secondText = outputText(second.data);
  if (secondText && String(second.data?.status ?? "") !== "incomplete") return secondText;

  const secondStatus = String(second.data?.status ?? "");
  const secondReason = String(second.data?.incomplete_details?.reason ?? "");
  throw new Error(
    `OpenAI returned ${secondText || firstText ? "truncated text" : "no text"} after automatic retry (status ${secondStatus || firstStatus || "unknown"}${secondReason || reason ? `; reason ${secondReason || reason}` : ""}).`
  );
}

type Effort = "minimal" | "low" | "medium" | "high";
const SARAH_EFFORT = (process.env.OPENAI_SARAH_EFFORT as Effort | undefined) ?? "minimal";

export async function chat(system: string, turns: Turn[], model: string = MODELS.sarah, effort: Effort = SARAH_EFFORT): Promise<string> {
  // Sarah is a customer-facing intake assistant: keep latency and cost low.
  return complete(system, turns, model, 900, undefined, effort);
}

export async function text(
  system: string,
  user: string,
  model: string,
  maxTokens = 12000,
  temperature = 0.35,
  reasoningEffort?: "minimal" | "low" | "medium" | "high"
): Promise<string> {
  return complete(system, [{ role: "user", content: user }], model, maxTokens, temperature, reasoningEffort);
}

export async function json<T = unknown>(
  system: string,
  user: string,
  model: string,
  maxTokens = 16000,
  reasoningEffort?: "minimal" | "low" | "medium" | "high"
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

  const raw = await complete(jsonSystem, [{ role: "user", content: user }], model, maxTokens, undefined, reasoningEffort);
  const parsed = parse(raw);
  if (parsed !== null) return parsed;

  // One more attempt with a bigger budget before giving up: a cut-off or
  // fenced reply is far more often a budget problem than a model problem.
  const retry = await complete(jsonSystem, [{ role: "user", content: user }], model, Math.min(maxTokens * 2, 30000), undefined, reasoningEffort);
  const reparsed = parse(retry);
  if (reparsed !== null) return reparsed;
  throw new Error(`Model did not return usable JSON (${retry.length} chars). First 200: ${retry.slice(0, 200)}`);
}
