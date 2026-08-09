import { json, MODELS } from "./ai";
import { analystPrompt } from "./prompts/analyst";
import { generatorPrompt, previewBanner, previewCloser } from "./prompts/generator";
import {
  getOrder, jsonb, listAssets, logEvent, saveVersion, setState, setWorkflow,
  slugify, sql, uniqueSlug, type Order, type ProjectAsset,
} from "./db";
import { generateAllProjectAssets, prepareStudio } from "./studio";
import { pushSite } from "./github";
import { validate } from "./pipeline";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_BUILD_MODEL = process.env.OPENAI_BUILD_MODEL ?? process.env.OPENAI_REASONING_MODEL ?? "gpt-5.1";
const OPENAI_AGENT_MODEL = process.env.OPENAI_AGENT_MODEL ?? process.env.OPENAI_REASONING_MODEL ?? OPENAI_BUILD_MODEL;
const PREVIEW_DOMAIN = process.env.PREVIEW_DOMAIN ?? "web99.ie";

function openAIKey(): string {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) throw new Error("OPENAI_API_KEY is required.");
  if (value.startsWith("sk-ant-")) throw new Error("OPENAI_API_KEY contains an Anthropic key. Replace it with an OpenAI API key.");
  return value;
}

function outputText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const block of item?.content ?? []) {
      if (block?.type === "output_text" && typeof block.text === "string") parts.push(block.text);
    }
  }
  return parts.join("").trim();
}

function parseJson<T>(raw: string): T {
  try { return JSON.parse(raw) as T; }
  catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1)) as T;
    throw new Error(`OpenAI returned unusable JSON: ${raw.slice(0, 250)}`);
  }
}

async function openAIResponse(
  instructions: string,
  input: string,
  model = OPENAI_BUILD_MODEL,
  maxOutputTokens = 50000
): Promise<string> {
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      reasoning: { effort: "medium" },
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
    }),
  });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error(`OpenAI returned invalid JSON (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${data?.error?.message ?? raw.slice(0, 500)}`);
  const text = outputText(data);
  if (!text) throw new Error("OpenAI returned no text.");
  return text;
}

function assetManifest(assets: ProjectAsset[]) {
  return assets.map((a) => ({
    id: a.asset_key,
    title: a.title,
    kind: a.kind,
    prompt: a.prompt,
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

async function buildWithOpenAI(order: Order, assets: ProjectAsset[], steer?: string): Promise<Record<string, string>> {
  const instructions = `${generatorPrompt()}\n\nWEB99 OPENAI BUILD AGENT\nYou are the final frontend build agent. The operator has already approved the strategy, copy and images. Build a polished, mobile-first production demo. DO NOT request or invent new images. Use only the supplied asset placeholders exactly as listed. Return JSON with {"files":{"index.html":"..."},"notes":"..."}. Every useful supplied asset should be used intentionally, but do not force an asset where it hurts the design. Keep all business facts inside the supplied brief/analysis/copy. The website must be self-contained and ready for the Web99 deployment function.`;
  const input = `PLAN\n${order.plan_text ?? JSON.stringify(order.analysis ?? {}, null, 2)}\n\n` +
    `FINAL COPY\n${order.studio_copy ?? ""}\n\nASSETS\n${JSON.stringify(assetManifest(assets), null, 2)}\n\n` +
    `CONFIRMED BUSINESS DATA\n${JSON.stringify(order.brief ?? {}, null, 2)}` +
    (steer?.trim() ? `\n\nOPERATOR CHANGE\n${steer.trim()}` : "");
  const result = parseJson<{ files: Record<string, string>; notes?: string }>(await openAIResponse(instructions, input));
  if (!result.files?.["index.html"]) throw new Error("OpenAI build agent returned no index.html.");
  return injectAssets(result.files, assets);
}

async function reviseWithOpenAI(
  order: Order,
  files: Record<string, string>,
  instruction: string
): Promise<Record<string, string>> {
  const instructions = `You are the Web99 OpenAI frontend revision agent. Apply the requested changes precisely while preserving everything else. Keep the site mobile-first, self-contained and truthful. Never invent business facts. Return ONLY JSON: {"files": {path: full file contents}}. Return every existing file, including unchanged files.`;
  const input = `REQUESTED CHANGE\n${instruction}\n\nCONFIRMED DATA\n${JSON.stringify(order.brief ?? {}, null, 2)}\n\nCURRENT FILES\n${JSON.stringify(files)}`;
  const result = parseJson<{ files: Record<string, string> }>(await openAIResponse(instructions, input));
  if (!result.files?.["index.html"]) throw new Error("OpenAI revision agent returned no index.html.");
  return result.files;
}

export async function makeMasterPlan(orderId: string, steer?: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  await setState(orderId, "analysing", { source: "master_dashboard" });
  await setWorkflow(orderId, "planning", { message: `Web99 Agent is planning ${order.business_name ?? "this website"}` });
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
    if (!planText) throw new Error("Web99 Agent returned no editable plan text.");
    await sql`
      UPDATE orders SET analysis = ${jsonb(analysis)}, plan_text = ${planText}, state = 'ready',
        workflow_stage = 'plan_ready', failure_reason = NULL WHERE id = ${orderId}`;
    await logEvent(orderId, "plan_ready", {
      message: `${order.business_name ?? "Website"} plan is ready to approve`,
      provider: "openai",
      model: MODELS.analyst,
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

async function qa(order: Order, files: Record<string, string>): Promise<Record<string, any>> {
  const staticProblems = validate(files);
  try {
    const result = await json<Record<string, any>>(
      `You are Web99's final OpenAI QA reviewer. Review generated website source before it reaches the operator. Check mobile hierarchy, CTA visibility, clarity, overflow/layout risks visible from source, spelling, truthful use of supplied business facts, SEO basics, accessibility basics and unresolved placeholders. Do not demand features the customer never supplied facts for. Return {"score":0-100,"pass":boolean,"issues":[{"severity":"critical|major|minor","problem":string,"fix":string}],"summary":string}.`,
      `BUSINESS DATA\n${JSON.stringify(order.brief ?? {}, null, 2)}\n\nFILES\n${JSON.stringify(files)}`,
      MODELS.qa,
      7000
    );
    return { ...result, staticProblems, provider: "openai", model: MODELS.qa };
  } catch (err) {
    return {
      score: staticProblems.length ? 70 : 85,
      pass: staticProblems.length === 0,
      staticProblems,
      qaError: (err as Error).message,
      provider: "static-fallback",
    };
  }
}

function qaNeedsRepair(report: Record<string, any>): boolean {
  if (Array.isArray(report.staticProblems) && report.staticProblems.length > 0) return true;
  if (report.pass === false) return true;
  return Array.isArray(report.issues) && report.issues.some((i: any) => i?.severity === "critical" || i?.severity === "major");
}

async function repairFromQa(order: Order, files: Record<string, string>, report: Record<string, any>): Promise<Record<string, string>> {
  return reviseWithOpenAI(
    order,
    files,
    `Automated QA found these issues. Fix every critical/major issue and every static validation problem without inventing business facts.\n\n${JSON.stringify(report, null, 2)}`
  );
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
  await setWorkflow(orderId, "qa", { message: `OpenAI QA is checking ${order.business_name ?? "the site"}` });

  let finalFiles = files;
  let qaReport = await qa(order, finalFiles);
  if (qaNeedsRepair(qaReport)) {
    await logEvent(orderId, "qa_repair", { message: "QA found issues; Web99 Agent is repairing them automatically", report: qaReport });
    finalFiles = await repairFromQa(order, finalFiles, qaReport);
    const secondReport = await qa(order, finalFiles);
    qaReport = { ...secondReport, repairedAutomatically: true, firstPass: qaReport };
  }

  const slug = order.slug ?? (await uniqueSlug(slugify(order.business_name ?? "site", order.location ?? "")));
  const previewUrl = `https://${slug}.${PREVIEW_DOMAIN}`;
  const publishFiles = decorate(finalFiles, order);
  const sha = await pushSite(slug, publishFiles, order.business_name ?? slug);
  await sql`
    UPDATE orders SET generated = ${jsonb(finalFiles)}, qa_report = ${jsonb(qaReport)}, slug = ${slug},
      preview_url = ${previewUrl}, commit_sha = ${sha}, build_provider = ${provider},
      build_job_id = NULL, state = 'live', workflow_stage = 'ready', failure_reason = NULL
    WHERE id = ${orderId}`;
  const version = await saveVersion(orderId, finalFiles, sha, previewUrl, note);
  await logEvent(orderId, "deployed", {
    message: `${order.business_name ?? "Website"} has been deployed`,
    previewUrl,
    sha,
    version,
    provider,
    qaPass: qaReport.pass ?? null,
  });
}

export async function startMasterBuild(orderId: string, who = "operator", steer?: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (!order.studio_copy) throw new Error("Web99 Agent needs to prepare the Studio copy first.");
  const assets = await listAssets(orderId);
  const missing = assets.filter((a) => a.status !== "ready");
  if (missing.length) throw new Error(`${missing.length} image asset${missing.length === 1 ? " is" : "s are"} not generated yet.`);
  await setState(orderId, "generating", { source: "openai_master_build" });
  await setWorkflow(orderId, "building", { message: `OpenAI build agent started ${order.business_name ?? "website"}` });

  try {
    const files = await buildWithOpenAI(order, assets, steer);
    await finaliseMasterBuild(orderId, files, `openai:${OPENAI_BUILD_MODEL}`, "OpenAI Agent build");
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
  if (!instruction.trim()) throw new Error("Tell the Web99 Agent what to change.");
  await setWorkflow(orderId, "building", { message: `OpenAI Agent is applying changes to ${order.business_name ?? "website"}` });
  try {
    const files = await reviseWithOpenAI(order, order.generated, instruction);
    await finaliseMasterBuild(orderId, files, `openai:${OPENAI_BUILD_MODEL}`, instruction.trim().slice(0, 180));
    await logEvent(orderId, "revision", { message: `Changes applied by OpenAI Agent`, by: who });
  } catch (err) {
    const message = (err as Error).message;
    await sql`UPDATE orders SET workflow_stage = 'failed', failure_reason = ${message} WHERE id = ${orderId}`;
    await logEvent(orderId, "error", { step: "revision", message });
    throw err;
  }
}

type AgentAction = "make_plan" | "prepare_studio" | "generate_images" | "build_site" | "nothing_to_do";

async function chooseNextAction(order: Order, assets: ProjectAsset[]): Promise<AgentAction> {
  const deterministic = (): AgentAction => {
    if (!order.plan_text) return "make_plan";
    if (!order.studio_copy) return "prepare_studio";
    if (assets.some((a) => a.status !== "ready")) return "generate_images";
    if (!order.generated || order.state === "failed") return "build_site";
    return "nothing_to_do";
  };

  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${openAIKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_AGENT_MODEL,
        instructions: "You are the Web99 workflow controller. Choose exactly one backend tool that advances this project by one logical step. Never send the customer a preview automatically. Respect the current project state; do not skip required plan/copy/image/build stages.",
        input: JSON.stringify({
          state: order.state,
          workflowStage: order.workflow_stage,
          hasPlan: Boolean(order.plan_text),
          hasStudioCopy: Boolean(order.studio_copy),
          assets: assets.map((a) => ({ status: a.status, key: a.asset_key })),
          hasBuild: Boolean(order.generated),
          hasPreview: Boolean(order.preview_url),
          autopilot: order.autopilot,
        }),
        tools: [
          { type: "function", name: "make_plan", description: "Create the editable 500-600 word website strategy plan from the Sarah chat and structured brief.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
          { type: "function", name: "prepare_studio", description: "Turn an approved plan into finished website copy and editable image prompts.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
          { type: "function", name: "generate_images", description: "Generate all pending approved image assets through the OpenAI image API.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
          { type: "function", name: "build_site", description: "Build, QA, auto-repair and deploy the website using the approved copy and generated assets.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
          { type: "function", name: "nothing_to_do", description: "Use only when the demo is already built/deployed and no production step remains.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
        ],
        tool_choice: "required",
        max_output_tokens: 600,
      }),
    });
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : {};
    if (!response.ok) throw new Error(data?.error?.message ?? `HTTP ${response.status}`);
    const call = (data?.output ?? []).find((item: any) => item?.type === "function_call");
    const action = call?.name as AgentAction | undefined;
    if (new Set<AgentAction>(["make_plan", "prepare_studio", "generate_images", "build_site", "nothing_to_do"]).has(action as AgentAction)) return action as AgentAction;
    return deterministic();
  } catch {
    return deterministic();
  }
}

export async function runNextStep(orderId: string): Promise<string> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  const assets = await listAssets(orderId);
  const action = await chooseNextAction(order, assets);

  switch (action) {
    case "make_plan":
      await makeMasterPlan(orderId);
      return "plan";
    case "prepare_studio":
      await approvePlanAndContinue(orderId);
      return "studio";
    case "generate_images":
      await generateAllProjectAssets(orderId);
      return "images";
    case "build_site":
      await startMasterBuild(orderId);
      return "build";
    default:
      return "done";
  }
}
