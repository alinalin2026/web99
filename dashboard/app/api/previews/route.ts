import { NextRequest, NextResponse } from "next/server";
import { createPreview, promotePreviewToOrder } from "@/lib/previews";
import type { Site } from "@/lib/site-schema";

export const runtime = "nodejs";

function isValidSite(body: unknown): body is Site {
  if (!body || typeof body !== "object") return false;
  const s = body as Record<string, unknown>;
  return (
    typeof s.name === "string" &&
    typeof s.category === "string" &&
    typeof s.trade === "string" &&
    typeof s.town === "string" &&
    Array.isArray(s.services) &&
    typeof s.theme === "object" &&
    typeof s.logo === "object" &&
    typeof s.images === "object" &&
    typeof s.copy === "object"
  );
}

/** Saves the quiz answers as a Site and returns web99.ie/p/<id>. Used by the
    reveal step, "email me this preview", and as the thing Buy references. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidSite(body)) {
    return NextResponse.json({ error: "Site object missing required fields" }, { status: 400 });
  }

  const preview = await createPreview(body);
  const base = process.env.APP_URL ?? "https://web99.ie";
  return NextResponse.json({ id: preview.id, url: `${base}/p/${preview.id}` });
}

/** Buy click: reuse the just-created preview to spin up (or reuse) an
    orders row, then hand back /buy/<orderId> — the existing Stripe route. */
export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { previewId } = (body ?? {}) as { previewId?: string };
  if (!previewId) {
    return NextResponse.json({ error: "previewId required" }, { status: 400 });
  }

  try {
    const orderId = await promotePreviewToOrder(previewId);
    return NextResponse.json({ orderId, buyUrl: `/buy/${orderId}` });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
