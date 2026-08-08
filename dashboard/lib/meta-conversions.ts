import { createHash } from "node:crypto";
import { metaConfig } from "./meta";
import { resolveMetaPixelId } from "./meta-sales";

type Attribution = Record<string, string | number> | null | undefined;

type ConversionInput = {
  eventName: "Lead" | "InitiateCheckout" | "Purchase";
  eventId: string;
  email?: string | null;
  attribution?: Attribution;
  clientIp?: string | null;
  eventSourceUrl?: string | null;
  value?: number;
  currency?: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function attributionString(attribution: Attribution, key: string): string | null {
  const value = attribution?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildFbc(attribution: Attribution): string | null {
  const fbclid = attributionString(attribution, "fbclid");
  if (!fbclid) return null;
  const landedAt = attribution?.landed_at;
  const ts = typeof landedAt === "number" && Number.isFinite(landedAt) ? Math.round(landedAt) : Date.now();
  return `fb.1.${ts}.${fbclid}`;
}

export async function sendMetaConversion(input: ConversionInput): Promise<{ ok: boolean; pixelId?: string; error?: string }> {
  const cfg = metaConfig();
  if (!cfg.configured) return { ok: false, error: "Meta Ads is not configured." };

  try {
    const pixelId = await resolveMetaPixelId(true);
    if (!pixelId) return { ok: false, error: "No Meta Pixel/Dataset could be resolved." };

    const userData: Record<string, unknown> = {};
    if (input.email) userData.em = [sha256(input.email)];
    const userAgent = attributionString(input.attribution, "user_agent");
    if (userAgent) userData.client_user_agent = userAgent;
    if (input.clientIp) userData.client_ip_address = input.clientIp;
    const fbc = buildFbc(input.attribution);
    if (fbc) userData.fbc = fbc;

    const sourceUrl =
      input.eventSourceUrl ||
      attributionString(input.attribution, "landing_url") ||
      "https://web99.ie/";

    const event = {
      event_name: input.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: "website",
      event_source_url: sourceUrl,
      user_data: userData,
      custom_data: {
        currency: input.currency || "EUR",
        value: input.value ?? 99,
      },
    };

    const form = new URLSearchParams();
    form.set("data", JSON.stringify([event]));
    const response = await fetch(`https://graph.facebook.com/${cfg.version}/${pixelId}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    if (!response.ok || body.error) {
      return { ok: false, pixelId, error: body.error?.message || `Meta CAPI HTTP ${response.status}` };
    }
    return { ok: true, pixelId };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
