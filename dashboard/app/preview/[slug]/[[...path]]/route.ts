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

function previewPrefix(slug: string): string {
  return `/preview/${encodeURIComponent(slug)}/`;
}

/**
 * Customer builds are authored as if they live at a domain root. Inside the
 * private dashboard preview they instead live below /preview/<slug>/.
 *
 * IMPORTANT: rewrite existing root-relative URLs BEFORE inserting <base>.
 * Otherwise the rewrite pass also rewrites the base tag itself and produces
 * paths such as /preview/slug/preview/slug/assets/site.css.
 */
function rewriteHtmlForPreview(html: string, slug: string): string {
  const prefix = previewPrefix(slug);
  let out = html;

  // Root-relative URLs ignore <base>, so namespace the URLs that already begin
  // at / first. Do not touch protocol-relative URLs such as //cdn.example.com.
  out = out.replace(
    /\b(href|src|action)=(["'])\/(?!\/)([^"']*)\2/gi,
    (_match, attr: string, quote: string, target: string) => {
      if (target.startsWith(`preview/${slug}/`)) {
        return `${attr}=${quote}/${target}${quote}`;
      }
      return `${attr}=${quote}${prefix}${target}${quote}`;
    }
  );

  out = out.replace(/\bsrcset=(["'])([^"']*)\1/gi, (_match, quote: string, value: string) => {
    const rewritten = value
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return trimmed;
        const firstSpace = trimmed.search(/\s/);
        const url = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
        const descriptor = firstSpace === -1 ? "" : trimmed.slice(firstSpace);
        if (url.startsWith(`${prefix}`)) return trimmed;
        return `${prefix}${url.slice(1)}${descriptor}`;
      })
      .join(", ");
    return `srcset=${quote}${rewritten}${quote}`;
  });

  // Relative URLs (assets/site.css, services.html, etc.) need the preview URL
  // to behave like a directory. Add the base LAST so it cannot be rewritten by
  // the root-relative pass above.
  out = out.replace(/<base\b[^>]*>/gi, "");
  if (/<head(?:\s|>)/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${prefix}">`);
  } else {
    out = `<base href="${prefix}">${out}`;
  }

  return out;
}

function rewriteCssForPreview(css: string, slug: string): string {
  const prefix = previewPrefix(slug);
  return css
    .replace(
      /url\(\s*(["']?)\/(?!\/)([^)"']+)\1\s*\)/gi,
      (_match, quote: string, target: string) => {
        if (target.startsWith(`preview/${slug}/`)) return `url(${quote}/${target}${quote})`;
        return `url(${quote}${prefix}${target}${quote})`;
      }
    )
    .replace(
      /@import\s+(["'])\/(?!\/)([^"']+)\1/gi,
      (_match, quote: string, target: string) => {
        if (target.startsWith(`preview/${slug}/`)) return `@import ${quote}/${target}${quote}`;
        return `@import ${quote}${prefix}${target}${quote}`;
      }
    );
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

  const requested = path?.length ? path.join("/") : "";
  const key = resolveFile(files, requested);
  if (!key) return NextResponse.json({ error: "File not found" }, { status: 404 });

  let content = files[key];
  const lower = key.toLowerCase();
  if (lower.endsWith(".html")) content = rewriteHtmlForPreview(content, slug);
  if (lower.endsWith(".css")) content = rewriteCssForPreview(content, slug);

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": contentType(key),
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
