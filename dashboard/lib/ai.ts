/* OpenAI wrapper for Sarah, extraction, planning, Studio and QA.
   One provider, two cost tiers: a fast model for intake/extraction and a
   stronger reasoning model for strategy, copy, QA and orchestration. */

const RESPONSES_URL = "https://api.openai.com/v1/responses";

export const MODELS = {
  sarah: process.env.OPENAI_FAST_MODEL ?? "gpt-5-mini",
  extract: process.env.OPENAI_FAST_MODEL ?? "gpt-5-mini",
  analyst: process.env.OPENAI_REASONING_MODEL ?? process.env.OPENAI_BUILD_MODEL ?? "gpt-5.1",
  studio: process.env.OPENAI_STUDIO_MODEL ?? process.env.OPENAI_REASONING_MODEL ?? process.env.OPENAI_BUILD_MODEL ?? "gpt-5.1",
  qa: process.env.OPENAI_QA_MODEL ?? process.env.OPENAI_REASONING_MODEL ?? process.env.OPENAI_BUILD_MODEL ?? "gpt-5.1",
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

async function complete(
  system: string,
  turns: Turn[],
  model: string,
  maxTokens: number,
  _temperature?: number
): Promise<string> {
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: system,
      input: turns.map((turn) => ({ role: turn.role, content: turn.content })),
      max_output_tokens: maxTokens,
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

  const text = outputText(data);
  if (!text) throw new Error("OpenAI returned no text content.");
  return text;
}

export async function chat(system: string, turns: Turn[], model: string = MODELS.sarah): Promise<string> {
  return complete(system, turns, model, 900);
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
