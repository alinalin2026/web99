import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth";
import { runOpsAgent, type OpsTurn } from "@/lib/ops-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  const denied = await requireOperator(req);
  if (denied) return denied;
  return noStore({ ok: true, service: "web99-ops-agent" });
}

export async function POST(req: NextRequest) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  let body: any;
  try { body = await req.json(); }
  catch { return noStore({ error: "Invalid JSON body" }, 400); }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return noStore({ error: "message is required" }, 400);
  if (message.length > 5000) return noStore({ error: "message is too long" }, 400);

  const history: OpsTurn[] = Array.isArray(body?.history)
    ? body.history.slice(-12).filter((turn: any) =>
        turn &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string"
      )
    : [];

  try {
    const result = await runOpsAgent(message, history);
    return noStore({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops-agent]", error);
    return noStore({ error: message.slice(0, 1200) }, 500);
  }
}
