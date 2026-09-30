import { NextRequest, NextResponse } from "next/server";
import { ensureMasterSchema, getOrder, jsonb, logEvent, sql } from "@/lib/db";
import { buildPage, loadLibrary, siteProblems } from "@/lib/instant-site";
import { maskEmail } from "@/lib/keep";
import { applyEdits, askSarahAboutPreview, type ChatTurn } from "@/lib/preview-chat";
import { clientIp, createLimiter } from "@/lib/ratelimit";
import { designFor, parseSiteContent, type SiteContent, type SiteDesign } from "@/lib/site-blocks";
import { paletteById } from "@/lib/palettes";
import { alertTeamOfChatRequest } from "@/lib/team-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/* "Let's chat about it" — Sarah discussing (and editing) a customer's generated preview.
   GET  ?orderId=…  -> the state the page needs to resume: is there a site, how many looks are left, the chat so far.
   POST {orderId, message} -> Sarah's reply; if she changed anything a new version is saved and `updated` is true.
   Public by the order's unguessable UUID (like the view page). Bounded per IP and per order. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ipLimit = createLimiter(60, 3_600_000);
const MAX_MESSAGES_PER_ORDER = 60;
const MAX_LOOKS = 8;
const inflight = new Set<string>();

interface SiteRow { html: string | null; style: string | null; palette: string | null; content: SiteContent | null; design: SiteDesign | null }

async function loadSite(orderId: string) {
  const rows = await sql<SiteRow[]>`
    SELECT detail->>'html' AS html, detail->>'style' AS style, detail->>'palette' AS palette, detail->'content' AS content, detail->'design' AS design
    FROM order_events WHERE order_id = ${orderId} AND kind = 'instant_site' AND detail ? 'html' ORDER BY created_at DESC, id DESC`;
  const looks = rows.filter((r) => r.style !== "chat").length;
  return { rows, latest: rows[0] ?? null, versions: rows.length, looks };
}

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId") ?? "";
  if (!UUID.test(orderId)) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  await ensureMasterSchema();
  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  const { latest, versions, looks } = await loadSite(orderId);
  const history = await sql<{ role: string; content: string }[]>`
    SELECT detail->>'role' AS role, detail->>'content' AS content FROM order_events
    WHERE order_id = ${orderId} AND kind = 'preview_chat' ORDER BY created_at, id LIMIT 80`;
  const sent = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM order_events WHERE order_id = ${orderId} AND kind = 'saved_for_later'`;
  return NextResponse.json(
    {
      hasSite: Boolean(latest?.html),
      canChat: Boolean(latest?.content),
      businessName: order.business_name,
      version: versions,
      remaining: Math.max(0, MAX_LOOKS - looks),
      maskedEmail: order.email ? maskEmail(order.email) : null,
      emailed: Number(sent[0]?.n ?? 0) > 0,
      history,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let orderId = ""; let message = "";
  try {
    const body = await req.json();
    orderId = String(body?.orderId ?? "");
    message = String(body?.message ?? "").trim();
  } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  if (!UUID.test(orderId)) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (message.length > 1000) return NextResponse.json({ error: "Please keep messages under 1,000 characters." }, { status: 400 });
  if (!ipLimit.allow(clientIp(req))) return NextResponse.json({ error: "That's a lot of messages in a short time — please wait a few minutes." }, { status: 429 });
  if (inflight.has(orderId)) return NextResponse.json({ error: "One moment — I'm still answering your last message." }, { status: 409 });

  await ensureMasterSchema();
  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  const site = await loadSite(orderId);
  if (!site.latest?.html) return NextResponse.json({ error: "Your website isn't built yet." }, { status: 409 });
  if (!site.latest.content) {
    return NextResponse.json({ error: "This preview was made before chat editing. Press “Try another version” once and then we can chat about it." }, { status: 409 });
  }
  const used = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM order_events WHERE order_id = ${orderId} AND kind = 'preview_chat' AND detail->>'role' = 'user'`;
  if (Number(used[0]?.n ?? 0) >= MAX_MESSAGES_PER_ORDER) {
    return NextResponse.json({ reply: "We've covered a lot! Someone from the team will pick this up by email if there's anything else.", updated: false, version: site.versions, remaining: Math.max(0, MAX_LOOKS - site.looks), readyToBuy: false, needsTeam: false });
  }

  inflight.add(orderId);
  try {
    const library = loadLibrary();
    const history = await sql<{ role: string; content: string }[]>`
      SELECT detail->>'role' AS role, detail->>'content' AS content FROM order_events
      WHERE order_id = ${orderId} AND kind = 'preview_chat' ORDER BY created_at DESC, id DESC LIMIT 10`;
    const turns: ChatTurn[] = history.reverse().filter((h) => h.role === "user" || h.role === "assistant").map((h) => ({ role: h.role as ChatTurn["role"], content: h.content }));
    await logEvent(orderId, "preview_chat", { role: "user", content: message });

    const folders = library.map((t) => t.key);
    const current = parseSiteContent(JSON.stringify(site.latest.content), { folders });
    const answer = await askSarahAboutPreview({ content: current, library, history: turns, message, signal: AbortSignal.timeout(60_000) });

    let content = current;
    let design: SiteDesign | null = site.latest.design;
    let style: string = "chat";
    let changed = false;
    let failedEdit = false;

    if (answer.edits) {
      try { content = applyEdits(content, answer.edits, folders); changed = true; }
      catch (err) { failedEdit = true; console.error("preview-chat edit rejected:", (err as Error).message); }
    }
    if (answer.photoFolder && folders.includes(answer.photoFolder) && answer.photoFolder !== content.photoFolder) {
      content = { ...content, photoFolder: answer.photoFolder };
      changed = true;
    }
    const hasPhotos = Boolean(library.find((t) => t.key === content.photoFolder)?.images.length);
    if (answer.look) {
      const seenPalettes = site.rows.map((r) => r.palette).filter((x): x is string => !!x);
      design = designFor(content, { style: answer.look, photos: hasPhotos, seenPalettes, avoid: design?.variants });
      style = answer.look;
      changed = true;
    } else if (!design) {
      design = designFor(content, { photos: hasPhotos });
    }

    let version = site.versions;
    if (changed) {
      const html = buildPage(content, design, library);
      const problems = siteProblems(html, { photos: hasPhotos, palette: paletteById(design.palette) });
      if (problems.length) {
        console.error("preview-chat render rejected:", problems.join("; "));
        changed = false;
        failedEdit = true;
      } else {
        version = site.versions + 1;
        await logEvent(orderId, "instant_site", { html, style, palette: design.palette, content, design, version, via: "preview_chat" });
      }
    }

    let reply = answer.reply;
    if (failedEdit && !changed) reply = `${reply}\n\n(I couldn't apply that change cleanly — could you say it a slightly different way?)`;
    await logEvent(orderId, "preview_chat", { role: "assistant", content: reply, updated: changed });

    let team = false;
    if (answer.needsTeam) {
      try { await alertTeamOfChatRequest(order, answer.needsTeam); team = true; }
      catch (err) { console.error("team alert failed", (err as Error).message); }
    }
    const looks = site.looks + (changed && style !== "chat" ? 1 : 0);
    return NextResponse.json({ reply, updated: changed, version, remaining: Math.max(0, MAX_LOOKS - looks), readyToBuy: answer.readyToBuy, needsTeam: team }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("preview-chat failed", (err as Error).message);
    return NextResponse.json({ error: "Sorry — I couldn't get a reply through just now. Please try again." }, { status: 502 });
  } finally {
    inflight.delete(orderId);
  }
}
