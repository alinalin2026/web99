import { NextRequest, NextResponse } from "next/server";
import { finaliseMasterBuild } from "@/lib/master-pipeline";
import { getOrder, logEvent, sql } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const expected = process.env.CLAUDE_CODE_CALLBACK_TOKEN?.trim();
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.headers.get("x-web99-token") || "";
  if (!expected || supplied !== expected) return NextResponse.json({ error: "Unauthorized runner callback" }, { status: 401 });

  const body = await req.json() as {
    orderId?: string; jobId?: string; status?: string; message?: string;
    files?: Record<string, string>; error?: string;
  };
  if (!body.orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  const order = await getOrder(body.orderId);
  if (!order) return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  if (body.jobId && order.build_job_id && body.jobId !== order.build_job_id) {
    return NextResponse.json({ error: "Job id does not match this project" }, { status: 409 });
  }

  if (body.error || body.status === "failed") {
    const error = body.error || body.message || "Claude Code runner failed";
    await sql`UPDATE orders SET state = 'failed', workflow_stage = 'failed', failure_reason = ${error} WHERE id = ${order.id}`;
    await logEvent(order.id, "error", { step: "claude_code", message: error, jobId: body.jobId ?? null });
    return NextResponse.json({ ok: true });
  }

  if (body.files && Object.keys(body.files).length) {
    await finaliseMasterBuild(order.id, body.files, "claude-code", "Claude Code build");
    return NextResponse.json({ ok: true, finalised: true });
  }

  await logEvent(order.id, "work_update", {
    message: body.message || `Claude Code: ${body.status || "working"}`,
    jobId: body.jobId ?? order.build_job_id,
    status: body.status ?? "working",
  });
  return NextResponse.json({ ok: true });
}
