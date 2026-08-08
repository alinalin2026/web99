import { NextRequest, NextResponse } from "next/server";
import { metaConfig } from "@/lib/meta";

const KEY = "w99-meta-pixel-20260808";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== KEY) return new NextResponse(null, { status: 404 });

  const cfg = metaConfig();
  if (!cfg.configured) return NextResponse.json({ ok: false, configured: false }, { status: 503 });

  const url = new URL(`https://graph.facebook.com/${cfg.version}/${cfg.actAccountId}/adspixels`);
  url.searchParams.set("fields", "id,name,last_fired_time");
  url.searchParams.set("limit", "50");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));

  return NextResponse.json(
    { ok: response.ok, pageId: "1326711580514431", pixels: response.ok ? body.data || [] : [], error: response.ok ? null : body },
    { status: response.ok ? 200 : 502 }
  );
}
