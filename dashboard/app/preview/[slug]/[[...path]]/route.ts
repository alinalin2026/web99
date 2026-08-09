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
 * private dashboard preview they instead live below /preview/<slug>/, so root
 * and relative asset/page URLs must stay inside that namespace.
 */
function rewriteHtmlForPreview(html: string, slug: string): string {
  const prefix = previewPrefix(slug);
  let out = html;

  // Relative links such as styles.css and services.html resolve under the
  // customer's preview rather than under the dashboard root.
  if (/<head(?:\s|>)/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${prefix}">`);
  } else {
    out = `<base href="${prefix}">${out}`;
  }

  // Root-relative URLs ignore <base>, so rewrite those explicitly.
  out = out.replace(
    /\b(href|src|action)=(["'])\/(?!\/)([^"']*)\2/gi,
    (_match, attr: string, quote: string, target: string) => `${attr}=${quote}${prefix}${target}${quote}`
  );

  // Also cover the common root-relative srcset form.
  out = out.replace(/\bsrcset=(["'])([^"']*)\1/gi, (_match, quote: string, value: string) => {
    const rewritten = value
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return trimmed;
        const firstSpace = trimmed.search(/\s/);
        if (firstSpace === -1) return `${prefix}${trimmed.slice(1)}`;
        return `${prefix}${trimmed.slice(1, firstSpace)}${trimmed.slice(firstSpace)}`;
      })
      .join(", ");
    return `srcset=${quote}${rewritten}${quote}`;
  });

  return out;
}

function rewriteCssForPreview(css: string, slug: string): string {
  const prefix = previewPrefix(slug);
  return css
    .replace(
      /url\(\s*(["']?)\/(?!\/)([^)"']+)\1\s*\)/gi,
      (_match, quote: string, target: string) => `url(${quote}${prefix}${target}${quote})`
    )
    .replace(
      /@import\s+(["'])\/(?!\/)([^"']+)\1/gi,
      (_match, quote: string, target: string) => `@import ${quote}${prefix}${target}${quote}`
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
