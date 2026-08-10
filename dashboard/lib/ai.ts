/* OpenAI wrapper for Sarah, extraction, planning, Studio and QA.
   One provider, two cost tiers: a fast model for intake/extraction and a
   stronger reasoning model for strategy, copy, QA and orchestration. */

const RESPONSES_URL = "https://api.openai.com/v1/responses";

export const MODELS = {
  sarah: process.env.OPENAI_FAST_MODEL ?? "gpt-5-mini",
  extract: process.env.OPENAI_FAST_MODEL ?? "gpt-5-mini",
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
  if (firstText) return firstText;

  const status = String(first.data?.status ?? "");
  const reason = String(first.data?.incomplete_details?.reason ?? "");
  const refusal = (first.data?.output ?? [])
    .flatMap((item: any) => item?.content ?? [])
    .find((block: any) => block?.type === "refusal")?.refusal;
  if (refusal) throw new Error(`OpenAI refused the request: ${String(refusal).slice(0, 500)}`);

  // A successful Responses API call may be incomplete before producing visible
  // output (for example when max_output_tokens is exhausted). Retry once with
  // a larger budget rather than failing an otherwise healthy website job.
  const retryTokens = Math.min(Math.max(maxTokens + 4000, Math.ceil(maxTokens * 1.5)), 30000);
  const second = await requestCompletion(system, turns, model, retryTokens, true, reasoningEffort);
  const secondText = outputText(second.data);
  if (secondText) return secondText;

  const secondStatus = String(second.data?.status ?? "");
  const secondReason = String(second.data?.incomplete_details?.reason ?? "");
  throw new Error(
    `OpenAI returned no text after automatic retry (status ${secondStatus || status || "unknown"}${secondReason || reason ? `; reason ${secondReason || reason}` : ""}).`
  );
}

export async function chat(system: string, turns: Turn[], model: string = MODELS.sarah): Promise<string> {
  // Sarah is a customer-facing intake assistant: keep latency and cost low.
  return complete(system, turns, model, 300, undefined, "minimal");
}

export async function text(
  system: string,
  user: string,
  model: string,
  maxTokens = 12000,
  temperature = 0.35
): Promise<string> {
  return complete(system, [{ role: "user", content: user }], model, maxTokens, temperature);
}

export async function json<T = unknown>(
  system: string,
  user: string,
  model: string,
  maxTokens = 16000
): Promise<T> {
  const jsonSystem = `${system}\n\nIMPORTANT: Return ONLY one valid JSON object. Do not use markdown fences, commentary, or any text before or after the JSON.`;
  const raw = await complete(jsonSystem, [{ role: "user", content: user }], model, maxTokens);
  try { return JSON.parse(raw) as T; }
  catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(raw.slice(start, end + 1)) as T;
    throw new Error(`Model did not return usable JSON (${raw.length} chars). First 200: ${raw.slice(0, 200)}`);
  }
}