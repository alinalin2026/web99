import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getOrder, addAsset, removeAsset, logEvent, type Asset } from "@/lib/db";
import { corsPreflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 30;

/* Logos, photos, menus, whatever a customer wants Sarah to have while she's
   still talking to them. Same cross-origin situation as /api/chat — the
   marketing site posts here directly — so this gets the same CORS treatment.

   Deliberately not operator-gated: this is called by a customer's own
   browser about their own not-yet-existent order, the same trust level as
   /api/chat itself. What it does gate is *which* order a file can be
   attached to (must exist and still be 'collecting') and what it accepts. */

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ASSETS_PER_ORDER = 12;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function safeFilename(name: string): string {
  return (name || "file").replace(/[^a-zA-Z0-9.\-_]+/g, "-").slice(-120) || "file";
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return withCors(req, NextResponse.json({ error: "Bad form data" }, { status: 400 }));
  }

  const orderId = String(form.get("orderId") ?? "").trim();
  const file = form.get("file");

  if (!orderId) {
    return withCors(req, NextResponse.json({ error: "Missing orderId" }, { status: 400 }));
  }
  if (!(file instanceof File)) {
    return withCors(req, NextResponse.json({ error: "Missing file" }, { status: 400 }));
  }

  let order;
  try {
    order = await getOrder(orderId);
  } catch (err) {
    return withCors(
      req,
      NextResponse.json({ error: `Could not reach the database: ${(err as Error).message}` }, { status: 503 })
    );
  }
  if (!order) {
    return withCors(req, NextResponse.json({ error: "No such order" }, { status: 404 }));
  }
  if (order.state !== "collecting") {
    return withCors(
      req,
      NextResponse.json({ error: "This conversation isn't taking attachments any more." }, { status: 400 })
    );
  }
  if (order.assets.length >= MAX_ASSETS_PER_ORDER) {
    return withCors(
      req,
      NextResponse.json({ error: `That's enough files for now (max ${MAX_ASSETS_PER_ORDER}).` }, { status: 400 })
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return withCors(
      req,
      NextResponse.json(
        { error: "That file type isn't supported. Images, PDFs and Word docs only." },
        { status: 400 }
      )
    );
  }
  if (file.size > MAX_BYTES) {
    return withCors(req, NextResponse.json({ error: "That file is over 8MB." }, { status: 400 }));
  }

  try {
    const filename = safeFilename(file.name);
    const blob = await put(`orders/${orderId}/${crypto.randomUUID()}-${filename}`, file, {
      access: "public",
      contentType: file.type,
    });

    const asset: Asset = {
      url: blob.url,
      filename,
      contentType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    await addAsset(orderId, asset);
    await logEvent(orderId, "asset", { filename, url: blob.url, size: file.size });

    return withCors(req, NextResponse.json({ ok: true, asset }));
  } catch (err) {
    return withCors(req, NextResponse.json({ error: (err as Error).message }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest) {
  let body: { orderId?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return withCors(req, NextResponse.json({ error: "Bad JSON" }, { status: 400 }));
  }

  const orderId = (body.orderId ?? "").trim();
  const url = (body.url ?? "").trim();
  if (!orderId || !url) {
    return withCors(req, NextResponse.json({ error: "Missing orderId or url" }, { status: 400 }));
  }

  const order = await getOrder(orderId);
  if (!order) {
    return withCors(req, NextResponse.json({ error: "No such order" }, { status: 404 }));
  }
  if (order.state !== "collecting") {
    return withCors(
      req,
      NextResponse.json({ error: "This conversation isn't taking changes any more." }, { status: 400 })
    );
  }
  if (!order.assets.some((a) => a.url === url)) {
    return withCors(req, NextResponse.json({ error: "That file isn't on this order" }, { status: 404 }));
  }

  try {
    await del(url);
  } catch (err) {
    console.error("blob delete failed", err);
  }
  await removeAsset(orderId, url);
  await logEvent(orderId, "asset_removed", { url });

  return withCors(req, NextResponse.json({ ok: true }));
}
