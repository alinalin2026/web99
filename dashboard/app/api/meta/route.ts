import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth";
import {
  createWeb99Campaign,
  getMetaOverview,
  metaConfig,
  MetaGraphError,
  setMetaObjectStatus,
} from "@/lib/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof MetaGraphError) {
    return NextResponse.json(
      {
        error: error.message,
        meta: {
          code: error.code,
          subcode: error.subcode,
          traceId: error.traceId,
        },
      },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
    );
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown Meta Ads error" },
    { status: 400 }
  );
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // Allows authenticated server-to-server calls.
  try {
    return new URL(origin).origin === req.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireOperator(req);
  if (auth) return auth;

  const cfg = metaConfig();
  if (!cfg.configured) {
    return NextResponse.json({
      configured: false,
      allowLaunch: cfg.allowLaunch,
      graphVersion: cfg.version,
      missing: [
        !cfg.token ? "META_ACCESS_TOKEN" : null,
        !cfg.accountId ? "META_AD_ACCOUNT_ID" : null,
      ].filter(Boolean),
    });
  }

  try {
    const overview = await getMetaOverview();
    return NextResponse.json({ configured: true, ...overview });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOperator(req);
  if (auth) return auth;
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin Meta Ads writes are blocked." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  try {
    if (body.action === "create_web99_campaign") {
      const result = await createWeb99Campaign({
        name: String(body.name || ""),
        dailyBudgetEur: Number(body.dailyBudgetEur),
        imageUrl: String(body.imageUrl || ""),
        primaryText: String(body.primaryText || ""),
        headline: String(body.headline || ""),
        description: String(body.description || ""),
        link: body.link ? String(body.link) : undefined,
        country: body.country ? String(body.country) : "IE",
        callToAction: body.callToAction ? String(body.callToAction) : "LEARN_MORE",
      });
      return NextResponse.json({ ok: true, result });
    }

    if (body.action === "set_status") {
      const status = String(body.status || "").toUpperCase();
      if (status !== "ACTIVE" && status !== "PAUSED") {
        return NextResponse.json({ error: "Status must be ACTIVE or PAUSED." }, { status: 400 });
      }
      const result = await setMetaObjectStatus(
        String(body.id || ""),
        status,
        body.confirm === "LAUNCH"
      );
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ error: "Unknown Meta Ads action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
