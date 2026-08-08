import { NextResponse } from "next/server";
import { getMetaOverview, metaConfig } from "@/lib/meta";

/* Temporary, read-only connectivity probe used during Meta setup.
   It never returns the access token and exposes no write operation. */
export async function GET() {
  const cfg = metaConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Meta Ads env vars are not configured in this deployment." },
      { status: 503 }
    );
  }

  try {
    const overview = await getMetaOverview();
    const account = overview.account as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      configured: true,
      account: {
        id: account.id ?? null,
        name: account.name ?? null,
        currency: account.currency ?? null,
        account_status: account.account_status ?? null,
      },
      pageConnected: Boolean(overview.pageId),
      campaignReadCount: overview.campaigns.length,
      graphVersion: overview.graphVersion,
      launchEnabled: overview.allowLaunch,
    });
  } catch (error) {
    const err = error as Error & { code?: number; subcode?: number; traceId?: string };
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: err.message,
        code: err.code ?? null,
        subcode: err.subcode ?? null,
        traceId: err.traceId ?? null,
      },
      { status: 502 }
    );
  }
}
