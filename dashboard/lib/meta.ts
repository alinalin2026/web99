/* ===========================================================================
   META ADS — SERVER-ONLY MARKETING API CLIENT
   ---------------------------------------------------------------------------
   Credentials live in Vercel environment variables. Nothing from this file is
   safe to import into a Client Component.

   The app deliberately creates campaigns/ad sets/ads PAUSED. Going ACTIVE is
   a separate operation guarded by META_ALLOW_LAUNCH=true plus an explicit
   confirmation string at the API layer.
   =========================================================================== */

const DEFAULT_GRAPH_VERSION = "v24.0";
const GRAPH_ORIGIN = "https://graph.facebook.com";

export type MetaCampaign = {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  created_time?: string;
  updated_time?: string;
};

export type Web99CampaignInput = {
  name: string;
  dailyBudgetEur: number;
  imageUrl: string;
  primaryText: string;
  headline: string;
  description: string;
  link?: string;
  country?: string;
  callToAction?: string;
};

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export class MetaGraphError extends Error {
  status: number;
  code?: number;
  subcode?: number;
  traceId?: string;

  constructor(status: number, body: GraphErrorBody) {
    const err = body.error;
    super(err?.message || `Meta Graph API returned HTTP ${status}`);
    this.name = "MetaGraphError";
    this.status = status;
    this.code = err?.code;
    this.subcode = err?.error_subcode;
    this.traceId = err?.fbtrace_id;
  }
}

function env(name: string): string {
  return (process.env[name] || "").trim();
}

export function metaConfig() {
  const token = env("META_ACCESS_TOKEN");
  const rawAccount = env("META_AD_ACCOUNT_ID");
  const accountId = rawAccount.replace(/^act_/, "");
  const pageId = env("META_PAGE_ID");
  const version = env("META_GRAPH_VERSION") || DEFAULT_GRAPH_VERSION;

  return {
    configured: Boolean(token && accountId),
    token,
    accountId,
    actAccountId: accountId ? `act_${accountId}` : "",
    pageId,
    version,
    allowLaunch: env("META_ALLOW_LAUNCH").toLowerCase() === "true",
  };
}

function encodeValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

async function graph<T>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const cfg = metaConfig();
  if (!cfg.configured) {
    throw new Error("Meta Ads is not configured. Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.");
  }

  const cleanPath = path.replace(/^\/+/, "");
  const base = `${GRAPH_ORIGIN}/${cfg.version}/${cleanPath}`;
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    values.set(key, encodeValue(value));
  }

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

export async function resolvePageId(): Promise<string> {
  const cfg = metaConfig();
  if (cfg.pageId) return cfg.pageId;

  const result = await graph<{ promote_pages?: { data?: Array<{ id: string }> } }>(
    "GET",
    cfg.actAccountId,
    { fields: "promote_pages", limit: 1 }
  );
  const id = result.promote_pages?.data?.[0]?.id;
  if (!id) {
    throw new Error(
      "No Facebook Page is available for this ad account. Set META_PAGE_ID explicitly in Vercel."
    );
  }
  return id;
}

export async function getMetaOverview() {
  const cfg = metaConfig();
  const [account, campaigns, insights, pageId] = await Promise.all([
    graph<Record<string, unknown>>("GET", cfg.actAccountId, {
      fields: "id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap",
    }),
    graph<{ data?: MetaCampaign[] }>("GET", `${cfg.actAccountId}/campaigns`, {
      fields:
        "id,name,objective,status,effective_status,daily_budget,lifetime_budget,budget_remaining,created_time,updated_time",
      limit: 50,
    }),
    graph<{ data?: Array<Record<string, unknown>> }>("GET", `${cfg.actAccountId}/insights`, {
      date_preset: "last_7d",
      fields: "spend,impressions,reach,clicks,ctr,cpc,cpm,actions,cost_per_action_type",
    }),
    resolvePageId().catch(() => ""),
  ]);

  return {
    account,
    campaigns: campaigns.data || [],
    insights: insights.data?.[0] || null,
    pageId,
    graphVersion: cfg.version,
    allowLaunch: cfg.allowLaunch,
  };
}

function requireText(value: string, label: string, max: number): string {
  const clean = value.trim();
  if (!clean) throw new Error(`${label} is required.`);
  if (clean.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return clean;
}

function requireHttpsUrl(value: string, label: string): string {
  const clean = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${label} must use https://`);
  return parsed.toString();
}

/** Build a complete Web99 cold-traffic campaign. Every object is PAUSED. */
export async function createWeb99Campaign(input: Web99CampaignInput) {
  const cfg = metaConfig();
  const pageId = await resolvePageId();

  const name = requireText(input.name, "Campaign name", 200);
  const primaryText = requireText(input.primaryText, "Primary text", 2200);
  const headline = requireText(input.headline, "Headline", 255);
  const description = requireText(input.description, "Description", 255);
  const imageUrl = requireHttpsUrl(input.imageUrl, "Image URL");
  const link = requireHttpsUrl(input.link || "https://web99.ie/start/", "Destination URL");
  const country = (input.country || "IE").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  const callToAction = (input.callToAction || "LEARN_MORE").toUpperCase();

  if (!Number.isFinite(input.dailyBudgetEur) || input.dailyBudgetEur < 1) {
    throw new Error("Daily budget must be at least €1.");
  }
  const dailyBudget = Math.round(input.dailyBudgetEur * 100);

  const campaign = await graph<{ id: string }>("POST", `${cfg.actAccountId}/campaigns`, {
    name,
    objective: "OUTCOME_TRAFFIC",
    buying_type: "AUCTION",
    special_ad_categories: [],
    status: "PAUSED",
  });

  const adSet = await graph<{ id: string }>("POST", `${cfg.actAccountId}/adsets`, {
    name: `${name} — Ireland Broad`,
    campaign_id: campaign.id,
    daily_budget: dailyBudget,
    billing_event: "IMPRESSIONS",
    optimization_goal: "LANDING_PAGE_VIEWS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: {
      geo_locations: { countries: [country] },
      age_min: 18,
      age_max: 65,
    },
    status: "PAUSED",
  });

  const creative = {
    object_story_spec: {
      page_id: pageId,
      link_data: {
        link,
        message: primaryText,
        name: headline,
        description,
        picture: imageUrl,
        call_to_action: { type: callToAction },
      },
    },
  };

  const ad = await graph<{ id: string }>("POST", `${cfg.actAccountId}/ads`, {
    name: `${name} — Ad 1`,
    adset_id: adSet.id,
    creative,
    status: "PAUSED",
  });

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    adId: ad.id,
    status: "PAUSED" as const,
    dailyBudgetEur: input.dailyBudgetEur,
    pageId,
    link,
  };
}

export async function setMetaObjectStatus(
  id: string,
  status: "ACTIVE" | "PAUSED",
  confirmedLaunch: boolean
) {
  const cfg = metaConfig();
  const cleanId = id.trim();
  if (!/^\d+$/.test(cleanId)) throw new Error("Invalid Meta object ID.");

  if (status === "ACTIVE") {
    if (!cfg.allowLaunch) {
      throw new Error("Launching is disabled. Set META_ALLOW_LAUNCH=true in Vercel first.");
    }
    if (!confirmedLaunch) {
      throw new Error("Launching requires the exact confirmation value LAUNCH.");
    }
  }

  return graph<{ success?: boolean }>("POST", cleanId, { status });
}
