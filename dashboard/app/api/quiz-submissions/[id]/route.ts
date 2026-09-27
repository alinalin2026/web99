import { NextRequest, NextResponse } from "next/server";
import { deleteSubmission, setSubmissionStatus } from "@/lib/quizCustomers";
import { requireOperator } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const action = String(body.action ?? "");

  try {
    switch (action) {
      case "review":
        await setSubmissionStatus(id, "reviewed");
        return NextResponse.json({ ok: true });
      case "unreview":
        await setSubmissionStatus(id, "new");
        return NextResponse.json({ ok: true });
      case "archive":
        await setSubmissionStatus(id, "archived");
        return NextResponse.json({ ok: true });
      case "unarchive":
        await setSubmissionStatus(id, "new");
        return NextResponse.json({ ok: true });
      case "delete":
        await deleteSubmission(id);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
