import { NextRequest, NextResponse } from "next/server";
import { getMetaOverview, metaConfig } from "@/lib/meta";

const PROBE = "w99-20260808-0425-meta-check";

async function inferPages() {
  const cfg = metaConfig();
  const adsUrl = new URL(`https://graph.facebook.com/${cfg.version}/${cfg.actAccountId}/ads`);
  adsUrl.searchParams.set("fields", "creative{object_story_spec}");
  adsUrl.searchParams.set("limit", "50");
  const adsRes = await fetch(adsUrl, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  const adsBody = (await adsRes.json().catch(() => ({}))) as {
    data?: Array<{ creative?: { object_story_spec?: { page_id?: string } } }>;
  };
  if (!adsRes.ok) return [];

  const ids = Array.from(
    new Set(
      (adsBody.data || [])
        .map((ad) => ad.creative?.object_story_spec?.page_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  return Promise.all(
    ids.map(async (id) => {
      const url = new URL(`https://graph.facebook.com/${cfg.version}/${id}`);
      url.searchParams.set("fields", "id,name");
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${cfg.token}` },
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string };
      return { id, name: res.ok ? body.name || null : null };
    })
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
    const [overview, inferredPages] = await Promise.all([getMetaOverview(), inferPages()]);
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
      inferredPages,
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
