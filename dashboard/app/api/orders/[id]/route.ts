import { NextRequest, NextResponse } from "next/server";
import { getOrder, sql, setState, logEvent } from "@/lib/db";
import { approve, rebuild } from "@/lib/pipeline";
import { siteReady, send } from "@/lib/email";
import { requireOperator } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

/* ===========================================================================
   POST /api/orders/:id  { action: "approve" | "rebuild" | "sendPreview" | "reject" }
   ---------------------------------------------------------------------------
   Every action here is a person clicking a button in the dashboard. All of
   them are operator-only — this is the line between a private build and a
   real business's public website.
   =========================================================================== */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "No such order" }, { status: 404 });

  const { action, steer, who } = (await req.json()) as {
    action: string;
    steer?: string;
    who?: string;
  };

  try {
    switch (action) {
      case "approve": {
        await approve(id, who ?? "operator");
        return NextResponse.json({ ok: true, state: "live" });
      }

      case "rebuild": {
        await rebuild(id, steer);
        return NextResponse.json({ ok: true, state: "review" });
      }

      case "sendPreview": {
        const fresh = await getOrder(id);
        if (!fresh?.email || !fresh.preview_url) {
          return NextResponse.json(
            { error: "Order has no email or no preview URL yet" },
            { status: 400 }
          );
        }
        if (fresh.state !== "live") {
          return NextResponse.json(
            { error: `Can only send a preview from "live" — this order is "${fresh.state}"` },
            { status: 400 }
          );
        }
        await send(
          fresh.email,
          siteReady("", fresh.business_name ?? "your business", fresh.preview_url)
        );
        await sql`UPDATE orders SET sent_at = now() WHERE id = ${id}`;
        await logEvent(id, "email", { template: "siteReady", to: fresh.email });
        await setState(id, "sent");
        return NextResponse.json({ ok: true, state: "sent" });
      }

      case "reject": {
        await setState(id, "lost", { by: who ?? "operator", reason: steer ?? "" });
        return NextResponse.json({ ok: true, state: "lost" });
      }

      default:
        return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
