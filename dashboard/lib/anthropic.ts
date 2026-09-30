/* The one place Claude is called from. Everything text-shaped in the dashboard
   (Sarah, extraction, instant previews, Studio, QA, the build agent, the Ops
   Agent) goes through createMessage() so model defaults, effort handling,
   refusals and streaming behave the same everywhere. */
import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-sonnet-5";

/* "minimal" is what the OpenAI-era call sites pass; Claude's lowest level is "low". */
export type Effort = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
type ClaudeEffort = "low" | "medium" | "high" | "xhigh" | "max";

const EFFORT_MODELS = /^claude-(opus-5|fable-5|mythos-5|sonnet-5|opus-4-[5-8]|sonnet-4-6)/;
const FALLBACK_MODELS = /^claude-(opus-5|fable-5|mythos-5)$/;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/* Thinking is on by default and shares max_tokens with the visible answer, so a
   budget sized for the answer alone truncates. Headroom is only billed if used. */
const THINKING_HEADROOM: Record<ClaudeEffort, number> = { low: 2000, medium: 6000, high: 12000, xhigh: 24000, max: 32000 };

export function toEffort(effort: Effort | undefined): ClaudeEffort {
  if (!effort || effort === "minimal") return "low";
  return effort;
}

export function tokenBudget(maxTokens: number, effort: Effort | undefined): number {
  return maxTokens + THINKING_HEADROOM[toEffort(effort)];
}

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  client = new Anthropic({ apiKey });
  return client;
}

export interface CallOptions {
  signal?: AbortSignal;
  /* Long generations must stream or the SDK refuses them. Defaults to on above 16k tokens. */
  stream?: boolean;
  /* Called with each text delta as it arrives (implies streaming). */
  onText?: (delta: string) => void;
  /* Server-side refusal fallback (Claude API, opus-5/fable-5/mythos-5). On unless ANTHROPIC_FALLBACKS=off. */
  fallbacks?: boolean;
}

export type MessageParams = Omit<Anthropic.MessageCreateParamsNonStreaming, "stream">;

function withEffort(params: MessageParams, effort: Effort | undefined): MessageParams {
  if (effort === undefined || !EFFORT_MODELS.test(params.model)) return params;
  return { ...params, output_config: { ...params.output_config, effort: toEffort(effort) } };
}

export async function createMessage(
  params: MessageParams & { effort?: Effort },
  opts: CallOptions = {}
): Promise<Anthropic.Message> {
  const { effort, ...rest } = params;
  const body = withEffort(rest, effort);
  const api = anthropic();
  const requestOptions = opts.signal ? { signal: opts.signal } : undefined;
  const stream = Boolean(opts.onText) || (opts.stream ?? body.max_tokens > 16000);

  const wantsFallbacks =
    (opts.fallbacks ?? true) && process.env.ANTHROPIC_FALLBACKS !== "off" && FALLBACK_MODELS.test(body.model);
  if (wantsFallbacks) {
    const betaBody = { ...body, betas: [FALLBACK_BETA], fallbacks: "default" as const };
    try {
      if (!stream) return (await api.beta.messages.create(betaBody, requestOptions)) as unknown as Anthropic.Message;
      const live = api.beta.messages.stream(betaBody, requestOptions);
      if (opts.onText) live.on("text", opts.onText);
      return (await live.finalMessage()) as unknown as Anthropic.Message;
    } catch (err) {
      // If the beta is unavailable to this org the plain request still works.
      if (!(err instanceof Anthropic.BadRequestError) || !/fallback|beta/i.test(err.message)) throw err;
      console.warn(`Anthropic server-side fallbacks rejected, retrying without: ${err.message}`);
    }
  }

  if (!stream) return api.messages.create(body, requestOptions);
  const live = api.messages.stream(body, requestOptions);
  if (opts.onText) live.on("text", opts.onText);
  return live.finalMessage();
}

export function messageText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/* A safety classifier decline is a normal 200 with stop_reason "refusal" — not an error
   from the SDK — so it has to be turned into one before anyone reads the content. */
export function assertNotRefused(message: Anthropic.Message): void {
  if (message.stop_reason !== "refusal") return;
  const category = (message as { stop_details?: { category?: string | null } }).stop_details?.category;
  throw new Error(`Claude declined the request${category ? ` (${category})` : ""}.`);
}

/* The Messages API needs the conversation to open with a user turn and rejects empty content. */
export function normalizeTurns<T extends { role: "user" | "assistant"; content: string }>(turns: T[]): Anthropic.MessageParam[] {
  const cleaned = turns.map((t) => ({ role: t.role, content: t.content.trim() || "(no text)" }));
  const firstUser = cleaned.findIndex((t) => t.role === "user");
  return firstUser === -1 ? [{ role: "user", content: "(no text)" }] : cleaned.slice(firstUser);
}
