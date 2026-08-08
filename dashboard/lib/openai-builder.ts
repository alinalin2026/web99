import { generatorPrompt } from "./prompts/generator";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const IMAGES_URL = "https://api.openai.com/v1/images/generations";

export const OPENAI_BUILD_MODEL = process.env.OPENAI_BUILD_MODEL ?? "gpt-5.6";
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";

interface ImageRequest {
  id: string;
  prompt: string;
  kind: "logo" | "photo";
  size?: "1024x1024" | "1536x1024" | "1024x1536";
}

export interface OpenAIWebsiteBuild {
  files: Record<string, string>;
  imageRequests?: ImageRequest[];
  domainSuggestions?: string[];
  notes?: string;
}

function key(): string {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) throw new Error("OPENAI_API_KEY is not set.");
  if (value.startsWith("sk-ant-")) {
    throw new Error(
      "OPENAI_API_KEY contains an Anthropic key. Put the sk-ant-* key in ANTHROPIC_API_KEY and a real OpenAI key in OPENAI_API_KEY."
    );
  }
  return value;
}

function outputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const block of item?.content ?? []) {
      if (block?.type === "output_text" && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
  }
  return parts.join("").trim();
}

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(raw.slice(start, end + 1)) as T;
    throw new Error(`OpenAI builder returned unusable JSON. First 300 chars: ${raw.slice(0, 300)}`);
  }
}

async function generateImage(request: ImageRequest): Promise<string> {
  const outputFormat = request.kind === "logo" ? "png" : "webp";
  const body = {
    model: OPENAI_IMAGE_MODEL,
    prompt:
      request.kind === "logo"
        ? `${request.prompt}\nCreate an original simple emblem/mark only, with no words or lettering. It will sit beside the business name rendered in HTML. Transparent background.`
        : `${request.prompt}\nThis is decorative website imagery, not a documentary photo of the real business. Do not invent identifiable staff, customers, premises, awards, signage or claims about the business.`,
    size: request.size ?? (request.kind === "logo" ? "1024x1024" : "1536x1024"),
    quality: "medium",
    background: request.kind === "logo" ? "transparent" : "opaque",
    output_format: outputFormat,
  };

  const response = await fetch(IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`OpenAI image API returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`OpenAI image API ${response.status}: ${data?.error?.message ?? raw.slice(0, 500)}`);
  }

  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`OpenAI image API returned no image for ${request.id}.`);
  return `data:image/${outputFormat};base64,${b64}`;
}

export async function buildWebsiteWithOpenAI(
  plan: Record<string, unknown>,
  steer?: string
): Promise<OpenAIWebsiteBuild> {
  const instructions = `${generatorPrompt()}\n\nOPENAI BUILD STAGE\nYou are the final builder. Produce a polished complete website, not a wireframe. You may request up to 3 generated visual assets using imageRequests. Prefer one original logo mark and one or two tasteful decorative trade-relevant images. Never use generated people or premises in a way that implies they are the real business.\n\nFor every generated asset, put a placeholder exactly like {{W99_IMAGE:asset-id}} wherever its data URL belongs in HTML or CSS, and add one matching imageRequests entry. Every placeholder must have exactly one matching request. Do not invent remote image URLs.`;

  const input = `Here is the Claude-approved build plan:\n\n${JSON.stringify(plan, null, 2)}${
    steer?.trim() ? `\n\nOperator note before building:\n${steer.trim()}` : ""
  }`;

  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_BUILD_MODEL,
      reasoning: { effort: "medium" },
      instructions,
      input,
      max_output_tokens: 50000,
    }),
  });

  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`OpenAI Responses API returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`OpenAI Responses API ${response.status}: ${data?.error?.message ?? raw.slice(0, 700)}`);
  }

  const text = outputText(data);
  if (!text) throw new Error("OpenAI builder returned no text output.");
  const result = parseJson<OpenAIWebsiteBuild>(text);
  if (!result.files?.["index.html"]) throw new Error("OpenAI builder returned no index.html.");

  const requests = (result.imageRequests ?? []).slice(0, 3);
  const images = new Map<string, string>();
  for (const request of requests) {
    if (!request?.id || !request?.prompt) continue;
    images.set(request.id, await generateImage(request));
  }

  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(result.files)) {
    let next = content;
    next = next.replace(/\{\{W99_IMAGE:([a-zA-Z0-9_-]+)\}\}/g, (match, id) => {
      return images.get(id) ?? match;
    });
    files[path] = next;
  }

  const unresolved = Object.values(files).join("\n").match(/\{\{W99_IMAGE:[^}]+\}\}/g);
  if (unresolved?.length) {
    throw new Error(`Builder left unresolved image placeholders: ${[...new Set(unresolved)].join(", ")}`);
  }

  return { ...result, files, imageRequests: requests };
}
