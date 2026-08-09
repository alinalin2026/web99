import { NextResponse } from "next/server";
import { ensureMasterSchema, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html") || !lower.includes(".")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> }
) {
  const { slug, path } = await params;
  await ensureMasterSchema();
  const [row] = await sql<{ generated: Record<string, string> | null }[]>`
    SELECT generated FROM orders WHERE slug = ${slug} LIMIT 1`;
  const files = row?.generated;
  if (!files) return NextResponse.json({ error: "Preview not found" }, { status: 404 });

  const requested = path?.length ? path.join("/") : "index.html";
  const key = files[requested] != null ? requested : requested.endsWith("/") ? `${requested}index.html` : requested;
  const content = files[key];
  if (typeof content !== "string") return NextResponse.json({ error: "File not found" }, { status: 404 });

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": contentType(key),
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
