import { getAsset, logEvent, sql } from "./db";

const IMAGES_URL = "https://api.openai.com/v1/images/generations";
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";

function key(): string {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) throw new Error("OPENAI_API_KEY is not set.");
  if (value.startsWith("sk-ant-")) throw new Error("OPENAI_API_KEY contains an Anthropic key.");
  return value;
}

export async function generateImageDataUrl(input: {
  prompt: string;
  kind?: string;
  size?: string | null;
}): Promise<string> {
  const logo = input.kind === "logo";
  const outputFormat = logo ? "png" : "webp";
  const allowed = new Set(["1024x1024", "1536x1024", "1024x1536"]);
  const size = input.size && allowed.has(input.size) ? input.size : logo ? "1024x1024" : "1536x1024";
  const safety = logo
    ? "Create an original, simple logo mark suitable for a small website header. Do not copy an existing trademark. Use a clean plain light background with strong separation around the mark. If lettering is not explicitly requested, make a mark only."
    : "This is illustrative website-demo imagery. Do not portray generated people, premises, signage, awards or completed work as documentary proof of the real business. No fake text or logos unless explicitly requested.";

  const response = await fetch(IMAGES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: `${input.prompt.trim()}\n\n${safety}`,
      size,
      quality: "medium",
      background: "opaque",
      output_format: outputFormat,
    }),
  });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error(`OpenAI image API returned invalid JSON (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`OpenAI image API ${response.status}: ${data?.error?.message ?? raw.slice(0, 500)}`);
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image API returned no image.");
  return `data:image/${outputFormat};base64,${b64}`;
}

export async function generateProjectAsset(orderId: string, assetId: string): Promise<void> {
  const asset = await getAsset(assetId, orderId);
  if (!asset) throw new Error("No such image asset.");
  await sql`UPDATE project_assets SET status = 'generating', error = NULL WHERE id = ${assetId}`;
  try {
    const dataUrl = await generateImageDataUrl({ prompt: asset.prompt, kind: asset.kind, size: asset.size });
    await sql`
      UPDATE project_assets SET status = 'ready', data_url = ${dataUrl}, error = NULL
      WHERE id = ${assetId}`;
    await logEvent(orderId, "image_ready", {
      message: `${asset.title} is ready`, assetId, title: asset.title, model: OPENAI_IMAGE_MODEL,
    });
  } catch (err) {
    const message = (err as Error).message;
    await sql`UPDATE project_assets SET status = 'failed', error = ${message} WHERE id = ${assetId}`;
    await logEvent(orderId, "error", { step: "image", assetId, message });
    throw err;
  }
}
