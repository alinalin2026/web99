import { NextResponse } from "next/server";
import { getPreview } from "@/lib/previews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Serves a donor-template preview's generated files (see
   lib/donor-templates.ts) at /p/<id>/<path>. Same rewrite approach as
   app/demo/[slug]/[[...path]]/route.ts -- see that file for the reasoning
   behind rewriting before inserting <base>. */

function contentType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html") || !lower.includes(".")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function previewPrefix(id: string): string {
  return `/p/${encodeURIComponent(id)}/`;
}

function rewriteHtml(html: string, id: string): string {
  const prefix = previewPrefix(id);
  let out = html;

  out = out.replace(
    /\b(href|src|action)=(["'])\/(?!\/)([^"']*)\2/gi,
    (_match, attr: string, quote: string, target: string) => {
      if (target.startsWith(`p/${id}/`)) return `${attr}=${quote}/${target}${quote}`;
      return `${attr}=${quote}${prefix}${target}${quote}`;
    }
  );

  out = out.replace(/<base\b[^>]*>/gi, "");
  out = /<head(?:\s|>)/i.test(out)
    ? out.replace(/<head([^>]*)>/i, `<head$1><base href="${prefix}">`)
    : `<base href="${prefix}">${out}`;
  return out;
}

function rewriteCss(css: string, id: string): string {
  const prefix = previewPrefix(id);
  return css.replace(/url\(\s*(["']?)\/(?!\/)([^)"']+)\1\s*\)/gi, (_match, quote: string, target: string) => {
    if (target.startsWith(`p/${id}/`)) return `url(${quote}/${target}${quote})`;
    return `url(${quote}${prefix}${target}${quote})`;
  });
}

function resolveFile(files: Record<string, string>, requested: string): string | null {
  const clean = requested.replace(/^\/+/, "");
  const candidates = clean
    ? [clean, clean.endsWith("/") ? `${clean}index.html` : `${clean}/index.html`, `${clean}.html`]
    : ["index.html"];
  for (const candidate of candidates) {
    if (typeof files[candidate] === "string") return candidate;
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; path?: string[] }> }) {
  const { id, path } = await params;
  const preview = await getPreview(id);
  const files = preview?.generated;
  if (!files) return NextResponse.json({ error: "Preview not found" }, { status: 404 });

  const requested = path?.length ? path.join("/") : "";
  const key = resolveFile(files, requested);
  if (!key) return NextResponse.json({ error: "File not found" }, { status: 404 });

  let content = files[key];
  const lower = key.toLowerCase();
  if (lower.endsWith(".html")) content = rewriteHtml(content, id);
  if (lower.endsWith(".css")) content = rewriteCss(content, id);

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": contentType(key),
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
