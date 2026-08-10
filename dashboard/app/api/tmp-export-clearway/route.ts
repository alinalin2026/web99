import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const TOKEN = "w99-clearway-migrate-20260810-0211";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await sql`
    SELECT id, business_name, location, email, brief, conversation, analysis,
           plan_text, studio_copy, generated, qa_report, slug, preview_url,
           commit_sha, state, workflow_stage, autopilot, approved_by,
           approved_at, created_at, updated_at
    FROM orders
    WHERE slug = 'clearway' OR lower(business_name) = 'clearway'
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const order = rows[0] ?? null;
  if (!order) return NextResponse.json({ error: "Clearway not found" }, { status: 404 });

  const assets = await sql`
    SELECT asset_key, title, kind, prompt, status, data_url, created_at, updated_at
    FROM project_assets
    WHERE order_id = ${order.id}
    ORDER BY created_at ASC
  `;

  return NextResponse.json({ order, assets }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
