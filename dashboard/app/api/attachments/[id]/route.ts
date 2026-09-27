import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth";
import { getAttachment } from "@/lib/db";

export const runtime = "nodejs";

/* Not in middleware.ts's PUBLIC list, so the login redirect already gates
   this — requireOperator here is belt-and-suspenders for the JSON 401
   other /api routes give API callers. Customer uploads are staff-only:
   nothing in the /start flow ever needs to read them back. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  const { id } = await params;
  const attachment = await getAttachment(id);
  if (!attachment) return NextResponse.json({ error: "No such attachment" }, { status: 404 });

  let size: number;
  try { size = (await stat(attachment.storage_path)).size; }
  catch { return NextResponse.json({ error: "File is missing on disk" }, { status: 404 }); }

  const stream = Readable.toWeb(createReadStream(attachment.storage_path)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": attachment.mime_type,
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${attachment.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
