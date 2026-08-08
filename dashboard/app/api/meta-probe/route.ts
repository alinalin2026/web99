import { NextRequest, NextResponse } from "next/server";
import { getMetaOverview, metaConfig } from "@/lib/meta";

const PROBE = "w99-20260808-0425-meta-check";

async function inferPageIds() {
  const cfg = metaConfig();
  const url = new URL(`https://graph.facebook.com/${cfg.version}/${cfg.actAccountId}/ads`);
  url.searchParams.set("fields", "creative{object_story_spec}");
  url.searchParams.set("limit", "50");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: Array<{ creative?: { object_story_spec?: { page_id?: string } } }>;
  };
  if (!res.ok) return [];
  return Array.from(
    new Set(
      (body.data || [])
        .map((ad) => ad.creative?.object_story_spec?.page_id)
        .filter((id): id is string => Boolean(id))
    )
  );
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("probe") !== PROBE) {
    return new NextResponse(null, { status: 404 });
  }

  const cfg = metaConfig();
  if (!cfg.configured) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  try {
    const [overview, inferredPageIds] = await Promise.all([getMetaOverview(), inferPageIds()]);
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
      inferredPageIds,
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
