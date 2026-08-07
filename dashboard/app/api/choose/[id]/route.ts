import { NextRequest, NextResponse } from "next/server";
import { sql, getOrder, logEvent } from "@/lib/db";

export const runtime = "nodejs";

/* Customer-facing, so no operator gate — but it can only ever set this one
   field, only on an order that has actually been paid for. */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { retention } = (await req.json()) as { retention?: string };

  if (retention !== "stayed" && retention !== "left") {
    return NextResponse.json({ error: "Bad choice" }, { status: 400 });
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "No such order" }, { status: 404 });
  if (order.state !== "won") {
    return NextResponse.json({ error: "Not a paid order" }, { status: 400 });
  }

  await sql`UPDATE orders SET retention = ${retention} WHERE id = ${id}`;
  await logEvent(id, "state_change", { step: "retention", retention });

  return NextResponse.json({ ok: true });
}
