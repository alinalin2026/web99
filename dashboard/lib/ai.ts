/* Thin wrapper over Anthropic's Messages API. Kept in one file so the model
   choice per step is visible in a single place and can be changed without
   hunting through the app.

   Sarah and extraction use Haiku because they are latency-sensitive. The
   analyst and generator use Sonnet because their output becomes a real
   business's public website and benefits from the stronger model. */

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export const MODELS = {
  sarah: process.env.SARAH_MODEL ?? "claude-haiku-4-5-20251001",
  extract: process.env.EXTRACT_MODEL ?? "claude-haiku-4-5-20251001",
  analyst: process.env.ANALYST_MODEL ?? "claude-sonnet-4-6",
  generator: process.env.GENERATOR_MODEL ?? "claude-sonnet-4-6",
} as const;

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[];
  error?: { message?: string };
}

function apiKey(): string {
  /* Prefer the correctly named variable. During the provider migration we
     also accept the existing OPENAI_API_KEY slot because the live Vercel
     project may already contain the user's sk-ant-* key there. Either way,
     the key is sent only to Anthropic — never to OpenAI. */
  const key =
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set (legacy OPENAI_API_KEY fallback is also empty)."
    );
  }
  return key;
}

async function complete(
  system: string,
  turns: Turn[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey(),
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: turns,
    }),
  });

  const raw = await response.text();
  let data: AnthropicResponse;
  try {
    data = raw ? (JSON.parse(raw) as AnthropicResponse) : {};
  } catch {
    throw new Error(`Anthropic returned invalid JSON (HTTP ${response.status}): ${raw.slice(0, 300)}`);
  }

  if (!response.ok) {
    const message = data.error?.message ?? raw.slice(0, 500) ?? "Unknown Anthropic API error";
    throw new Error(`Anthropic API ${response.status}: ${message}`);
  }

  const text = (data.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) throw new Error("Anthropic returned no text content.");
  return text;
}

/** Conversational reply. Used only by Sarah. */
export async function chat(
  system: string,
  turns: Turn[],
  model: string = MODELS.sarah
): Promise<string> {
  return complete(system, turns, model, 400, 0.7);
}

/** Structured output. Used by the extractor, analyst and generator.
    Claude is explicitly instructed to emit only JSON; the parser below also
    salvages a valid outer object if the response ever contains extra text. */
export async function json<T = unknown>(
  system: string,
  user: string,
  model: string,
  maxTokens = 16000
): Promise<T> {
  const jsonSystem = `${system}\n\nIMPORTANT: Return ONLY one valid JSON object. Do not use markdown fences, commentary, or any text before or after the JSON.`;
  const raw = await complete(
    jsonSystem,
    [{ role: "user", content: user }],
    model,
    maxTokens,
    0.3
  );

  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(raw.slice(start, end + 1)) as T;
    }
    throw new Error(
      `Model did not return usable JSON (${raw.length} chars). First 200: ${raw.slice(0, 200)}`
    );
  }
}
