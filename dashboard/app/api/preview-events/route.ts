import { NextRequest, NextResponse } from "next/server";
import { logPreviewEvent } from "@/lib/previews";

export const runtime = "nodejs";

const ALLOWED_KINDS = new Set([
  "step_1", "step_2", "step_3", "step_4", "step_5", "step_6", "step_7",
  "reveal", "buy_click", "email_click",
]);

/** Fire-and-forget funnel tracking from the quiz client. Never blocks or
    fails the UI — a bad beacon just doesn't get counted. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { previewId, kind, detail } = (body ?? {}) as {
    previewId?: string | null;
    kind?: string;
    detail?: Record<string, unknown>;
  };
  if (!kind || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await logPreviewEvent(previewId ?? null, kind, detail ?? {});
  } catch (err) {
    console.error("preview-events insert failed", err);
  }
  return NextResponse.json({ ok: true });
}
