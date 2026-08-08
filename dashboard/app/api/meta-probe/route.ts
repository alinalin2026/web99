import { NextRequest, NextResponse } from "next/server";
import { getMetaOverview, metaConfig } from "@/lib/meta";

const PROBE = "w99-20260808-0425-meta-check";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("probe") !== PROBE) {
    return new NextResponse(null, { status: 404 });
  }

  const cfg = metaConfig();
  if (!cfg.configured) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  try {
    const overview = await getMetaOverview();
    const account = overview.account as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      account: {
        id: account.id ?? null,
        name: account.name ?? null,
        currency: account.currency ?? null,
        status: account.account_status ?? null,
      },
      pageConnected: Boolean(overview.pageId),
      campaignReadCount: overview.campaigns.length,
      graphVersion: overview.graphVersion,
      launchEnabled: overview.allowLaunch,
    });
  } catch (error) {
    const err = error as Error & { code?: number; subcode?: number };
    return NextResponse.json(
      { ok: false, configured: true, error: err.message, code: err.code ?? null, subcode: err.subcode ?? null },
      { status: 502 }
    );
  }
}
