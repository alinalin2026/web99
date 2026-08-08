import { NextRequest, NextResponse } from "next/server";
import { getOrder, sql, setState, logEvent } from "@/lib/db";
import { approve, rebuild, makePlan, buildAndPublish } from "@/lib/pipeline";
import { siteReady, send } from "@/lib/email";
import { requireOperator } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/* Every action here is an explicit operator click in the dashboard. */
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
      case "makePlan": {
        if (order.state !== "ready" && order.state !== "failed") {
          return NextResponse.json(
            { error: `Can only make a plan for a ready lead — this order is "${order.state}"` },
            { status: 400 }
          );
        }
        await makePlan(id, steer);
        return NextResponse.json({ ok: true, state: "ready", planned: true });
      }

      case "buildAndPublish": {
        const fresh = await getOrder(id);
        if (!fresh?.analysis) {
          return NextResponse.json(
            { error: "Click Make the plan first, review it, then build." },
            { status: 400 }
          );
        }
        if (fresh.state !== "ready" && fresh.state !== "failed") {
          return NextResponse.json(
            { error: `Can only build an approved plan from ready/failed — this order is "${fresh.state}"` },
            { status: 400 }
          );
        }
        await buildAndPublish(id, who ?? "operator", steer);
        return NextResponse.json({ ok: true, state: "live" });
      }

      /* Legacy/manual review actions remain available for old orders. */
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
