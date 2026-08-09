import { json, MODELS } from "./ai";
import { analystPrompt } from "./prompts/analyst";
import { generatorPrompt, previewBanner, previewCloser } from "./prompts/generator";
import {
  getOrder, jsonb, listAssets, logEvent, saveVersion, setState, setWorkflow,
  slugify, sql, uniqueSlug, type Order, type ProjectAsset,
} from "./db";
import { generateAllProjectAssets } from "./studio";
import { prepareStudio } from "./studio";
import { pushSite } from "./github";
import { validate } from "./pipeline";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_BUILD_MODEL = process.env.OPENAI_BUILD_MODEL ?? "gpt-5.6";
const PREVIEW_DOMAIN = process.env.PREVIEW_DOMAIN ?? "web99.ie";

function openAIKey(): string {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value || value.startsWith("sk-ant-")) throw new Error("A real OPENAI_API_KEY is required for the fallback builder.");
  return value;
}

function outputText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) for (const block of item?.content ?? []) {
    if (block?.type === "output_text" && typeof block.text === "string") parts.push(block.text);
  }
  return parts.join("").trim();
}

function parseJson<T>(raw: string): T {
  try { return JSON.parse(raw) as T; }
  catch {
    const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1)) as T;
    throw new Error(`Builder returned unusable JSON: ${raw.slice(0, 250)}`);
  }
}

async function openAIResponse(instructions: string, input: string): Promise<string> {
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_BUILD_MODEL,
      reasoning: { effort: "medium" },
      instructions,
      input,
      max_output_tokens: 50000,
    }),
  });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error(`OpenAI builder returned invalid JSON (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`OpenAI builder ${response.status}: ${data?.error?.message ?? raw.slice(0, 500)}`);
  const text = outputText(data);
  if (!text) throw new Error("OpenAI builder returned no text.");
  return text;
}

function assetManifest(assets: ProjectAsset[]) {
  return assets.map((a) => ({
    id: a.asset_key, title: a.title, kind: a.kind, prompt: a.prompt,
    placeholder: `{{W99_ASSET:${a.asset_key}}}`,
  }));
}

function injectAssets(files: Record<string, string>, assets: ProjectAsset[]): Record<string, string> {
  const map = new Map(assets.filter((a) => a.data_url).map((a) => [a.asset_key, a.data_url as string]));
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    out[path] = content.replace(/\{\{W99_ASSET:([a-zA-Z0-9_-]+)\}\}/g, (match, id) => map.get(id) ?? match);
  }
  const unresolved = Object.values(out).join("\n").match(/\{\{W99_ASSET:[^}]+\}\}/g);
  if (unresolved?.length) throw new Error(`Build left unresolved assets: ${[...new Set(unresolved)].join(", ")}`);
  return out;
}

async function fallbackBuild(order: Order, assets: ProjectAsset[], steer?: string): Promise<Record<string, string>> {
  const instructions = `${generatorPrompt()}\n\nMASTER DASHBOARD BUILD MODE\nThe operator has already approved the strategy, copy and images. Build a polished, mobile-first production demo. DO NOT request or invent new images. Use only the supplied asset placeholders exactly as listed. Return JSON with {"files":{"index.html":"..."},"notes":"..."}. Every useful supplied asset should be used intentionally, but do not force an asset where it hurts the design. Keep all facts inside the supplied brief/analysis/copy.`;
  const input = `PLAN\n${order.plan_text ?? JSON.stringify(order.analysis ?? {}, null, 2)}\n\n` +
    `FINAL COPY\n${order.studio_copy ?? ""}\n\nASSETS\n${JSON.stringify(assetManifest(assets), null, 2)}\n\n` +
    `CONFIRMED BUSINESS DATA\n${JSON.stringify(order.brief ?? {}, null, 2)}` +
    (steer?.trim() ? `\n\nOPERATOR CHANGE\n${steer.trim()}` : "");
  const result = parseJson<{ files: Record<string, string>; notes?: string }>(await openAIResponse(instructions, input));
  if (!result.files?.["index.html"]) throw new Error("Builder returned no index.html.");
  return injectAssets(result.files, assets);
}

async function fallbackRevise(order: Order, instruction: string): Promise<Record<string, string>> {
  if (!order.generated) throw new Error("There is no deployed build to change.");
  const instructions = `You are a senior frontend engineer revising an existing small-business website. Apply the operator's requested changes precisely while preserving everything else. Keep the site mobile-first and self-contained. Never invent business facts. Return ONLY JSON: {"files": {path: full file contents}}. Return every existing file, including unchanged files.`;
  const input = `REQUESTED CHANGE\n${instruction}\n\nCONFIRMED DATA\n${JSON.stringify(order.brief ?? {}, null, 2)}\n\nCURRENT FILES\n${JSON.stringify(order.generated)}`;
  const result = parseJson<{ files: Record<string, string> }>(await openAIResponse(instructions, input));
  if (!result.files?.["index.html"]) throw new Error("Revision returned no index.html.");
  return result.files;
}

async function claudeRunner(payload: Record<string, unknown>): Promise<any | null> {
  const url = process.env.CLAUDE_CODE_RUNNER_URL?.trim();
  if (!url) return null;
  const token = process.env.CLAUDE_CODE_RUNNER_TOKEN?.trim();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({
      ...payload,
      callbackUrl: process.env.APP_URL ? `${process.env.APP_URL}/api/runner/callback` : undefined,
      callbackToken: process.env.CLAUDE_CODE_CALLBACK_TOKEN || undefined,
    }),
  });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error(`Claude Code runner returned invalid JSON (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Claude Code runner ${response.status}: ${data?.error ?? raw.slice(0, 500)}`);
  return data;
}

export async function makeMasterPlan(orderId: string, steer?: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  await setState(orderId, "analysing", { source: "master_dashboard" });
  await setWorkflow(orderId, "planning", { message: `Claude is planning ${order.business_name ?? "this website"}` });
  try {
    const transcript = order.conversation.map((t) => `${t.role === "user" ? "OWNER" : "SARAH"}: ${t.content}`).join("\n\n");
    const analysis = await json<Record<string, any>>(
      analystPrompt(),
      `CONVERSATION\n${transcript}\n\nEXTRACTED BRIEF\n${JSON.stringify(order.brief ?? {}, null, 2)}` +
        (steer?.trim() ? `\n\nOPERATOR NOTE\n${steer.trim()}` : ""),
      MODELS.analyst,
      12000
    );
    const planText = String(analysis.planText ?? "").trim();
    if (!planText) throw new Error("Claude returned no editable plan text.");
    await sql`
      UPDATE orders SET analysis = ${jsonb(analysis)}, plan_text = ${planText}, state = 'ready',
        workflow_stage = 'plan_ready', failure_reason = NULL WHERE id = ${orderId}`;
    await logEvent(orderId, "plan_ready", {
      message: `${order.business_name ?? "Website"} plan is ready to approve`, model: MODELS.analyst,
    });
  } catch (err) {
    const message = (err as Error).message;
    await sql`UPDATE orders SET state = 'failed', workflow_stage = 'failed', failure_reason = ${message} WHERE id = ${orderId}`;
    await logEvent(orderId, "error", { step: "plan", message });
    throw err;
  }
}

export async function approvePlanAndContinue(orderId: string, who = "operator"): Promise<void> {
  const order = await getOrder(orderId);
  if (!order?.plan_text) throw new Error("There is no plan to approve.");
  await sql`UPDATE orders SET approved_by = ${who}, approved_at = now() WHERE id = ${orderId}`;
  await logEvent(orderId, "plan_approved", { message: `${order.business_name ?? "Website"} plan approved`, by: who });
  await prepareStudio(orderId);
  const fresh = await getOrder(orderId);
  if (fresh?.autopilot === "assisted" || fresh?.autopilot === "full") {
    await generateAllProjectAssets(orderId);
    await startMasterBuild(orderId, who);
  }
}

async function qa(order: Order, files: Record<string, string>): Promise<Record<string, unknown>> {
  const staticProblems = validate(files);
  try {
    const result = await json<Record<string, unknown>>(
      `You are Web99's final QA reviewer. Review generated website source before it reaches the operator. Check mobile hierarchy, CTA visibility, clarity, overflow/layout risks visible from source, spelling, truthful use of supplied business facts, SEO basics, accessibility basics and unresolved placeholders. Do not demand features the customer never supplied facts for. Return {"score":0-100,"pass":boolean,"issues":[{"severity":"critical|major|minor","problem":string,"fix":string}],"summary":string}.`,
      `BUSINESS DATA\n${JSON.stringify(order.brief ?? {}, null, 2)}\n\nFILES\n${JSON.stringify(files)}`,
      MODELS.qa,
      6000
    );
    return { ...result, staticProblems };
  } catch (err) {
    return { score: staticProblems.length ? 70 : 85, pass: staticProblems.length === 0, staticProblems, qaError: (err as Error).message };
  }
}

function decorate(files: Record<string, string>, order: Order): Record<string, string> {
  const checkoutUrl = `${process.env.APP_URL ?? "https://dash.web99.ie"}/buy/${order.id}`;
  const banner = previewBanner({ checkoutUrl, businessName: order.business_name ?? "your business" });
  const closer = previewCloser({ checkoutUrl, businessName: order.business_name ?? "your business" });
  const out = { ...files };
  for (const [path, content] of Object.entries(out)) {
    if (!path.endsWith(".html")) continue;
    let html = content.replace(/<body([^>]*)>/i, (m) => `${m}\n${banner}\n`);
    if (path === "index.html") {
      html = /<footer[\s>]/i.test(html)
        ? html.replace(/<footer([\s>])/i, `${closer}\n<footer$1`)
        : html.replace(/<\/body>/i, `${closer}\n</body>`);
    }
    out[path] = html;
  }
  return out;
}

export async function finaliseMasterBuild(
  orderId: string,
  files: Record<string, string>,
  provider: string,
  note = "Automated build"
): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  await setWorkflow(orderId, "qa", { message: `QA is checking ${order.business_name ?? "the site"}` });
  const qaReport = await qa(order, files);
  const slug = order.slug ?? (await uniqueSlug(slugify(order.business_name ?? "site", order.location ?? "")));
  const previewUrl = `https://${slug}.${PREVIEW_DOMAIN}`;
  const publishFiles = decorate(files, order);
  const sha = await pushSite(slug, publishFiles, order.business_name ?? slug);
  await sql`
    UPDATE orders SET generated = ${jsonb(files)}, qa_report = ${jsonb(qaReport)}, slug = ${slug},
      preview_url = ${previewUrl}, commit_sha = ${sha}, build_provider = ${provider},
      build_job_id = NULL, state = 'live', workflow_stage = 'ready', failure_reason = NULL
    WHERE id = ${orderId}`;
  const version = await saveVersion(orderId, files, sha, previewUrl, note);
  await logEvent(orderId, "deployed", {
    message: `${order.business_name ?? "Website"} has been deployed`, previewUrl, sha, version, provider,
  });
}

export async function startMasterBuild(orderId: string, who = "operator", steer?: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (!order.studio_copy) throw new Error("Claude needs to prepare the Studio copy first.");
  const assets = await listAssets(orderId);
  const missing = assets.filter((a) => a.status !== "ready");
  if (missing.length) throw new Error(`${missing.length} image asset${missing.length === 1 ? " is" : "s are"} not generated yet.`);
  await setState(orderId, "generating", { source: "master_build" });
  await setWorkflow(orderId, "building", { message: `Build started for ${order.business_name ?? "website"}` });

  try {
    const runner = await claudeRunner({
      action: "build", orderId, operator: who,
      project: {
        businessName: order.business_name, trade: order.trade, location: order.location,
        brief: order.brief, analysis: order.analysis, approvedPlan: order.plan_text,
        finalCopy: order.studio_copy,
        assets: assets.map((a) => ({ id: a.asset_key, title: a.title, kind: a.kind, prompt: a.prompt, dataUrl: a.data_url })),
        steer: steer ?? "",
      },
    });
    if (runner) {
      if (runner.files && typeof runner.files === "object") {
        await finaliseMasterBuild(orderId, runner.files, "claude-code", "Claude Code build");
        return;
      }
      if (runner.status === "queued" || runner.jobId) {
        await sql`UPDATE orders SET build_provider = 'claude-code', build_job_id = ${String(runner.jobId ?? "queued")} WHERE id = ${orderId}`;
        await logEvent(orderId, "build_started", { message: "Claude Code is putting the site together", jobId: runner.jobId ?? null });
        return;
      }
      throw new Error("Claude Code runner returned neither files nor a job id.");
    }

    const files = await fallbackBuild(order, assets, steer);
    await finaliseMasterBuild(orderId, files, `openai-fallback:${OPENAI_BUILD_MODEL}`, "Fallback builder build");
  } catch (err) {
    const message = (err as Error).message;
    await sql`UPDATE orders SET state = 'failed', workflow_stage = 'failed', failure_reason = ${message} WHERE id = ${orderId}`;
    await logEvent(orderId, "error", { step: "build", message });
    throw err;
  }
}

export async function fixAndRedeploy(orderId: string, instruction: string, who = "operator"): Promise<void> {
  const order = await getOrder(orderId);
  if (!order?.generated) throw new Error("Build the site before requesting changes.");
  if (!instruction.trim()) throw new Error("Tell Claude what to change.");
  await setWorkflow(orderId, "building", { message: `Applying changes to ${order.business_name ?? "website"}` });
  const runner = await claudeRunner({ action: "revise", orderId, operator: who, instruction, currentFiles: order.generated, brief: order.brief });
  if (runner?.files) {
    await finaliseMasterBuild(orderId, runner.files, "claude-code", instruction.trim().slice(0, 180));
    return;
  }
  if (runner?.jobId) {
    await sql`UPDATE orders SET build_provider = 'claude-code', build_job_id = ${String(runner.jobId)} WHERE id = ${orderId}`;
    await logEvent(orderId, "build_started", { message: "Claude Code is applying your changes", jobId: runner.jobId });
    return;
  }
  const files = await fallbackRevise(order, instruction);
  await finaliseMasterBuild(orderId, files, `openai-fallback:${OPENAI_BUILD_MODEL}`, instruction.trim().slice(0, 180));
}

export async function runNextStep(orderId: string): Promise<string> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (!order.plan_text) { await makeMasterPlan(orderId); return "plan"; }
  if (!order.studio_copy) { await approvePlanAndContinue(orderId); return "studio"; }
  const assets = await listAssets(orderId);
  if (assets.some((a) => a.status !== "ready")) { await generateAllProjectAssets(orderId); return "images"; }
  if (!order.generated || order.state === "failed") { await startMasterBuild(orderId); return "build"; }
  return "done";
}
