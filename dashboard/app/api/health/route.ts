import { NextResponse } from "next/server";
import { ensureMasterSchema, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await ensureMasterSchema();
    const [db] = await sql<{
      queued: string;
      running: string;
      failed: string;
      orders: string;
    }[]>`
      SELECT
        (SELECT count(*)::text FROM jobs WHERE status = 'queued') AS queued,
        (SELECT count(*)::text FROM jobs WHERE status = 'running') AS running,
        (SELECT count(*)::text FROM jobs WHERE status = 'failed') AS failed,
        (SELECT count(*)::text FROM orders) AS orders`;

    return NextResponse.json({
      ok: true,
      service: "web99",
      database: "ok",
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      queue: {
        queued: Number(db?.queued ?? 0),
        running: Number(db?.running ?? 0),
        failed: Number(db?.failed ?? 0),
      },
      orders: Number(db?.orders ?? 0),
      responseMs: Date.now() - started,
      time: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      service: "web99",
      database: "error",
      error: error instanceof Error ? error.message.slice(0, 300) : "Unknown health error",
      responseMs: Date.now() - started,
      time: new Date().toISOString(),
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
