import { NextRequest, NextResponse } from "next/server";
import { capturePreviewLead, getPreview, logPreviewEvent } from "@/lib/previews";
import { previewReady, send } from "@/lib/email";

export const runtime = "nodejs";

/** "Email me this preview" — captures the lead (promotes preview → order,
    same as Buy) and sends the existing previewReady template via Resend. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { previewId, email } = (body ?? {}) as { previewId?: string; email?: string };
  if (!previewId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "previewId and a valid email are required" }, { status: 400 });
  }

  const preview = await getPreview(previewId);
  if (!preview) return NextResponse.json({ error: "Preview not found" }, { status: 404 });

  const orderId = await capturePreviewLead(previewId, email);
  const previewUrl = `${process.env.APP_URL ?? "https://web99.ie"}/p/${previewId}`;

  try {
    await send(email, previewReady(preview.site.name, previewUrl));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  await logPreviewEvent(previewId, "email_click", { email });
  return NextResponse.json({ ok: true });
}
