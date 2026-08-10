import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const HELPER = process.env.WEB99_OPS_HELPER ?? "/usr/local/libexec/web99-ops-tool";

export interface OpsTurn {
  role: "user" | "assistant";
  content: string;
}

export interface OpsAction {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  summary: string;
}

const SYSTEM = `You are the private Web99 Ops Agent running on the same AWS server as Web99.
Your job is to diagnose and repair Web99 production using ONLY the tools provided.

Operating rules:
- Prefer the smallest fix with the fewest moving parts.
- Diagnose before changing anything unless the user explicitly asks for a simple restart/backup/deploy.
- Never invent shell commands and never claim you ran anything outside the provided tools.
- Never request, reveal, print, or inspect secrets, API keys, passwords, .env files or private keys.
- For a failure, inspect status/logs/config/URL first, identify the actual cause, then use the narrowest repair tool.
- Mutating tools are allowed when the user asks to fix, repair, restart, deploy, restore or back up. Do not mutate for a mere status question.
- "repair_current_release" is an emergency tool. Use it only when release_status/status proves /srv/web99/current is broken or missing.
- "restore_tracked_config" restores only tracked Web99 Nginx/systemd config. Use it when live config has drifted or is broken.
- A dashboard restart is deliberately scheduled a few seconds later so this API request can finish. Do not immediately recheck it in the same turn; tell the user to wait ~15 seconds.
- A deployment runs independently in systemd and may restart this dashboard. Once started, tell the user it is continuing in the background and use deploy status on a later turn.
- Do not say something is fixed until an appropriate check proves it, except when the action necessarily continues after this request (scheduled dashboard restart or background deploy); in those cases say exactly what was scheduled.
- Keep replies concise and practical. State what you found, what you did, and the next useful check.
- This console is only for Web99 server operations. Decline unrelated requests.`;

const TOOLS = [
  {
    type: "function",
    name: "get_status",
    description: "Read current Web99 release, service states and local app/database health. Read-only and usually the first diagnostic tool.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "get_logs",
    description: "Read recent logs for the dashboard, worker or nginx. Read-only.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        service: { type: "string", enum: ["dashboard", "worker", "nginx"] },
        lines: { type: "integer", minimum: 10, maximum: 250 },
      },
      required: ["service", "lines"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "test_nginx",
    description: "Validate the active Nginx configuration without changing it.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "reload_nginx",
    description: "Validate Nginx and reload it if valid. Use only when a reload is actually needed.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "restart_service",
    description: "Restart the Web99 worker, schedule a dashboard restart, or do both. Dashboard restart is delayed so the current reply can complete.",
    strict: true,
    parameters: {
      type: "object",
      properties: { target: { type: "string", enum: ["dashboard", "worker", "all"] } },
      required: ["target"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "backup_database",
    description: "Create and verify a PostgreSQL backup using Web99's tracked backup script.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "start_deploy",
    description: "Start the tracked Web99 production deployment as an independent systemd job. It continues even if the dashboard restarts.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "get_deploy_status",
    description: "Read status and recent logs for the most recent Ops Agent deployment started since boot.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "restore_tracked_config",
    description: "Restore Nginx and systemd unit files from the tracked /srv/web99/app/ops configuration, validate Nginx, and reload it. Does not restart the dashboard.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "check_url",
    description: "GET one path on https://web99.ie, follow redirects, and return final status/URL plus a small body preview. The host is fixed to web99.ie.",
    strict: true,
    parameters: {
      type: "object",
      properties: { path: { type: "string", minLength: 1, maxLength: 300 } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "release_status",
    description: "Inspect /srv/web99/current and list newest immutable releases. Read-only.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "repair_current_release",
    description: "Emergency repair: point /srv/web99/current to the newest completed release, restart worker, reload Nginx and schedule dashboard restart. Use only after proving current is broken/missing.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "show_config",
    description: "Read one safe production config file: tracked live Nginx, dashboard systemd unit, or worker systemd unit. Never exposes the env/secrets file.",
    strict: true,
    parameters: {
      type: "object",
      properties: { target: { type: "string", enum: ["nginx", "dashboard-service", "worker-service"] } },
      required: ["target"],
      additionalProperties: false,
    },
  },
] as const;

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  return key;
}

function model(): string {
  return process.env.OPENAI_OPS_MODEL
    ?? process.env.OPENAI_AGENT_MODEL
    ?? process.env.OPENAI_REASONING_MODEL
    ?? "gpt-5.1";
}

function outputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const block of item?.content ?? []) {
      if (block?.type === "output_text" && typeof block.text === "string") parts.push(block.text);
    }
  }
  return parts.join("").trim();
}

function clip(value: string, max = 12000): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n...[truncated ${value.length - max} chars]`;
}

async function helper(action: string, args: string[] = [], timeoutMs = 45_000): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      "sudo",
      ["-n", HELPER, action, ...args],
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, PATH: process.env.PATH ?? "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
      }
    );
    const output = clip([stdout, stderr].filter(Boolean).join("\n").trim() || "OK");
    return { ok: true, output };
  } catch (error: any) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, output: clip([stdout, stderr, message].filter(Boolean).join("\n").trim()) };
  }
}

async function executeTool(name: string, args: Record<string, any>): Promise<{ ok: boolean; output: string }> {
  switch (name) {
    case "get_status": return helper("status");
    case "get_logs": return helper("logs", [String(args.service), String(args.lines)]);
    case "test_nginx": return helper("nginx-test");
    case "reload_nginx": return helper("nginx-reload");
    case "restart_service": return helper("restart", [String(args.target)]);
    case "backup_database": return helper("backup", [], 120_000);
    case "start_deploy": return helper("deploy");
    case "get_deploy_status": return helper("deploy-status");
    case "restore_tracked_config": return helper("restore-config");
    case "check_url": return helper("check-url", [String(args.path)]);
    case "release_status": return helper("release-status");
    case "repair_current_release": return helper("repair-current");
    case "show_config": return helper("show-config", [String(args.target)]);
    default: return { ok: false, output: `Unknown tool: ${name}` };
  }
}

async function responseRequest(input: any[]): Promise<any> {
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model(),
      instructions: SYSTEM,
      input,
      tools: TOOLS,
      tool_choice: "auto",
      max_output_tokens: 2600,
      store: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const raw = await response.text();
  let data: any;
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { throw new Error(`OpenAI returned invalid JSON (HTTP ${response.status}): ${raw.slice(0, 300)}`); }
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${data?.error?.message ?? raw.slice(0, 500)}`);
  return data;
}

export async function runOpsAgent(message: string, history: OpsTurn[] = []): Promise<{ message: string; actions: OpsAction[] }> {
  const safeHistory = history
    .slice(-12)
    .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 4000) }));

  const input: any[] = [
    ...safeHistory,
    { role: "user", content: message.slice(0, 5000) },
  ];
  const actions: OpsAction[] = [];

  for (let round = 0; round < 8; round++) {
    const response = await responseRequest(input);
    const calls = (response?.output ?? []).filter((item: any) => item?.type === "function_call");

    if (!calls.length) {
      const text = outputText(response);
      return {
        message: text || "I finished the tool run but did not receive a final text response.",
        actions,
      };
    }

    // Carry the model output forward manually. This keeps Responses API storage
    // disabled while preserving function calls/reasoning needed for the next turn.
    input.push(...(response.output ?? []));

    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try { args = call.arguments ? JSON.parse(call.arguments) : {}; }
      catch {
        const bad = { ok: false, output: "The model produced invalid JSON tool arguments." };
        input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(bad) });
        actions.push({ name: call.name, arguments: {}, ok: false, summary: bad.output });
        continue;
      }

      const result = await executeTool(call.name, args as Record<string, any>);
      actions.push({
        name: call.name,
        arguments: args,
        ok: result.ok,
        summary: clip(result.output, 700),
      });
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }
  }

  throw new Error("Ops Agent exceeded its maximum tool-call rounds.");
}
