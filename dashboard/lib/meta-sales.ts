import { metaConfig, MetaGraphError } from "./meta";

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export type SalesAd = {
  name: string;
  imageHash: string;
  primaryText: string;
  headline: string;
  description: string;
};

async function graph<T>(method: "GET" | "POST", path: string, params: Record<string, unknown> = {}): Promise<T> {
  const cfg = metaConfig();
  if (!cfg.configured) throw new Error("Meta Ads is not configured.");

  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    values.set(key, typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value));
  }

  const cleanPath = path.replace(/^\/+/, "");
  const base = `https://graph.facebook.com/${cfg.version}/${cleanPath}`;
  const url = method === "GET" && values.size ? `${base}?${values}` : base;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? values.toString() : undefined,
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as T & GraphErrorBody;
  if (!response.ok || body.error) throw new MetaGraphError(response.status, body);
  return body as T;
}

export async function uploadMetaAdImage(base64Jpeg: string): Promise<{ hash: string; url?: string }> {
  const cfg = metaConfig();
  const result = await graph<{ images?: Record<string, { hash: string; url?: string }> }>(
    "POST",
    `${cfg.actAccountId}/adimages`,
    { bytes: base64Jpeg }
  );
  const first = result.images ? Object.values(result.images)[0] : undefined;
  if (!first?.hash) throw new Error("Meta accepted the image request but did not return an image hash.");
  return first;
}

export async function createWeb99SalesCampaign(input: {
  name: string;
  dailyBudgetEur: number;
  pixelId: string;
  pageId: string;
  ads: SalesAd[];
  link?: string;
}) {
  const cfg = metaConfig();
  const name = input.name.trim();
  const link = input.link || "https://web99.ie/start/";
  if (!name) throw new Error("Campaign name is required.");
  if (!/^\d+$/.test(input.pixelId)) throw new Error("A valid Meta Pixel/Dataset ID is required.");
  if (!/^\d+$/.test(input.pageId)) throw new Error("A valid Facebook Page ID is required.");
  if (!Array.isArray(input.ads) || input.ads.length !== 5) throw new Error("Exactly five ads are required.");
  if (!Number.isFinite(input.dailyBudgetEur) || input.dailyBudgetEur < 5) throw new Error("Daily budget must be at least €5.");

  const campaign = await graph<{ id: string }>("POST", `${cfg.actAccountId}/campaigns`, {
    name,
    objective: "OUTCOME_SALES",
    buying_type: "AUCTION",
    special_ad_categories: [],
    status: "PAUSED",
  });

  const adSet = await graph<{ id: string }>("POST", `${cfg.actAccountId}/adsets`, {
    name: `${name} — Ireland Broad 25+`,
    campaign_id: campaign.id,
    daily_budget: Math.round(input.dailyBudgetEur * 100),
    billing_event: "IMPRESSIONS",
    optimization_goal: "OFFSITE_CONVERSIONS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    destination_type: "WEBSITE",
    promoted_object: {
      pixel_id: input.pixelId,
      custom_event_type: "LEAD",
    },
    targeting: {
      geo_locations: { countries: ["IE"] },
      age_min: 25,
      age_max: 65,
    },
    status: "PAUSED",
  });

  const createdAds: Array<{ id: string; creativeId: string; name: string }> = [];
  for (let i = 0; i < input.ads.length; i += 1) {
    const ad = input.ads[i];
    const creative = await graph<{ id: string }>("POST", `${cfg.actAccountId}/adcreatives`, {
      name: `${name} — Creative ${i + 1}`,
      object_story_spec: {
        page_id: input.pageId,
        link_data: {
          link,
          image_hash: ad.imageHash,
          message: ad.primaryText,
          name: ad.headline,
          description: ad.description,
          call_to_action: { type: "LEARN_MORE" },
        },
      },
      url_tags: `utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term=ireland_broad`,
    });

    const created = await graph<{ id: string }>("POST", `${cfg.actAccountId}/ads`, {
      name: ad.name,
      adset_id: adSet.id,
      creative: { creative_id: creative.id },
      status: "PAUSED",
    });
    createdAds.push({ id: created.id, creativeId: creative.id, name: ad.name });
  }

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    adIds: createdAds,
    pageId: input.pageId,
    pixelId: input.pixelId,
    dailyBudgetEur: input.dailyBudgetEur,
    optimizationEvent: "LEAD",
    objective: "OUTCOME_SALES",
    status: "PAUSED" as const,
  };
}
