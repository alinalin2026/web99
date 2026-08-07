import OpenAI from "openai";

/* Thin wrapper over the model calls. Kept in one file so the model choice per
   step is visible in a single place and can be changed without hunting.

   Sarah runs on a fast model because she is in a live conversation and latency
   is felt. The analyst and generator run on the strongest model available —
   their output becomes a real business's public website, so quality there is
   worth far more than the few seconds it costs. */

/* Constructed on first use, not on import — otherwise `next build`, which
   loads every route module, needs a live API key just to collect routes. */
let _client: OpenAI | undefined;
function client(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set. See .env.example.");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const MODELS = {
  sarah: process.env.SARAH_MODEL ?? "gpt-4o-mini",
  extract: process.env.EXTRACT_MODEL ?? "gpt-4o-mini",
  analyst: process.env.ANALYST_MODEL ?? "gpt-4o",
  generator: process.env.GENERATOR_MODEL ?? "gpt-4o",
} as const;

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** Conversational reply. Used only by Sarah. */
export async function chat(
  system: string,
  turns: Turn[],
  model: string = MODELS.sarah
): Promise<string> {
  const res = await client().chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 400,
    messages: [{ role: "system", content: system }, ...turns],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/** Structured output. Used by the extractor, the analyst and the generator.
    Temperature is low and JSON mode is forced — these steps feed machines. */
export async function json<T = unknown>(
  system: string,
  user: string,
  model: string,
  maxTokens = 16000
): Promise<T> {
  const res = await client().chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "";
  try {
    return JSON.parse(raw) as T;
  } catch {
    /* JSON mode makes this rare, but a truncated response is still possible on
       a large site. Salvage the outermost object rather than losing the build. */
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
