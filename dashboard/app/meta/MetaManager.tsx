"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  effective_status?: string;
};

type Overview = {
  configured: boolean;
  missing?: string[];
  allowLaunch?: boolean;
  graphVersion?: string;
  pageId?: string;
  account?: Record<string, unknown>;
  campaigns?: Campaign[];
  insights?: Record<string, unknown> | null;
  error?: string;
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d8d4e5",
  borderRadius: 10,
  padding: "11px 12px",
  font: "inherit",
  background: "white",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  color: "#292535",
};

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export default function MetaManager() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await jsonFetch("/api/meta"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Meta Ads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRecommendedCampaign() {
    const ok = window.confirm(
      "Create the Web99 Ireland sales campaign PAUSED? It will create 1 campaign, 1 broad Ireland ad set at €100/day and 5 paused ads. Nothing will spend until you launch it later."
    );
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await jsonFetch("/api/meta/web99-campaign", { method: "POST" });
      if (response.alreadyExists) {
        setNotice(`Campaign already exists: ${response.campaign.name} (${response.campaign.id}).`);
      } else {
        setNotice(
          `Created PAUSED campaign ${response.campaignId}, ad set ${response.adSetId}, with ${response.adIds.length} ads. Pixel/Dataset ${response.pixelId}. No spend has started.`
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the recommended campaign.");
    } finally {
      setBusy(false);
    }
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    const values = new FormData(event.currentTarget);
    const payload = {
      action: "create_web99_campaign",
      name: values.get("name"),
      dailyBudgetEur: Number(values.get("dailyBudgetEur")),
      imageUrl: values.get("imageUrl"),
      primaryText: values.get("primaryText"),
      headline: values.get("headline"),
      description: values.get("description"),
      link: values.get("link"),
      country: "IE",
      callToAction: "LEARN_MORE",
    };

    try {
      const response = await jsonFetch("/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setNotice(
        `Created PAUSED campaign ${response.result.campaignId}, ad set ${response.result.adSetId}, ad ${response.result.adId}. No spend has started.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create campaign.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "ACTIVE" | "PAUSED") {
    if (status === "ACTIVE") {
      const ok = window.confirm(
        "This can start spending from the campaign budget. Launch this Meta campaign?"
      );
      if (!ok) return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await jsonFetch("/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_status",
          id,
          status,
          confirm: status === "ACTIVE" ? "LAUNCH" : undefined,
        }),
      });
      setNotice(status === "ACTIVE" ? "Launch request accepted by Meta." : "Campaign paused.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change campaign status.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <p>Loading Meta Ads…</p>;

  if (data && !data.configured) {
    return (
      <div style={{ maxWidth: 760 }}>
        <div style={{ padding: 22, borderRadius: 16, background: "#fff7e8", border: "1px solid #efd59b" }}>
          <h2 style={{ marginTop: 0 }}>Meta is ready for credentials</h2>
          <p style={{ lineHeight: 1.6 }}>
            Add the missing Vercel environment variables, redeploy the dashboard, then reload this page.
          </p>
          <code>{(data.missing || []).join(" · ")}</code>
        </div>
      </div>
    );
  }

  const account = data?.account || {};
  const campaigns = data?.campaigns || [];
  const insights = data?.insights || {};

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {error ? (
        <div style={{ padding: 14, borderRadius: 10, background: "#fff0f0", color: "#8a1111" }}>{error}</div>
      ) : null}
      {notice ? (
        <div style={{ padding: 14, borderRadius: 10, background: "#edf9ef", color: "#165d26" }}>{notice}</div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <Stat label="Ad account" value={String(account.name || account.id || "Connected")} />
        <Stat label="Last 7 days spend" value={insights.spend ? `€${insights.spend}` : "€0"} />
        <Stat label="Last 7 days clicks" value={String(insights.clicks || "0")} />
        <Stat label="Meta API" value={String(data?.graphVersion || "v24.0")} />
      </section>

      <section style={{ padding: 22, border: "2px solid #5b3fe8", borderRadius: 16, background: "#f7f5ff" }}>
        <p style={{ margin: 0, color: "#5b3fe8", fontWeight: 800, fontSize: 13 }}>RECOMMENDED WEB99 CAMPAIGN</p>
        <h2 style={{ margin: "6px 0 8px" }}>Ireland broad · 5 ads · conversion optimized</h2>
        <p style={{ margin: "0 0 14px", color: "#5f596d", lineHeight: 1.55 }}>
          Creates one PAUSED Sales campaign, one Ireland age 25–65 broad ad set at €100/day, and five PAUSED ads. Ads land on the Web99 homepage. It resolves or creates the Web99 Pixel/Dataset and optimizes initially for completed website briefs (Lead), while purchases are tracked separately.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createRecommendedCampaign()}
          style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#5b3fe8", color: "white", fontWeight: 800, cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? "Working…" : "Create 5-ad campaign — PAUSED"}
        </button>
      </section>

      <section style={{ padding: 22, border: "1px solid #e2dfeb", borderRadius: 16, background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "#5b3fe8", fontWeight: 800, fontSize: 13 }}>CUSTOM TEST</p>
            <h2 style={{ margin: "5px 0 8px" }}>Create a one-ad campaign</h2>
            <p style={{ marginTop: 0, color: "#666173", lineHeight: 1.55 }}>
              This older manual builder remains available for small tests. Campaign, ad set and ad are created PAUSED.
            </p>
          </div>
          <span style={{ padding: "7px 10px", borderRadius: 999, background: "#f0edff", color: "#5138cf", fontWeight: 800, fontSize: 12 }}>
            SAFE MODE
          </span>
        </div>

        <form onSubmit={createCampaign} style={{ display: "grid", gap: 14 }}>
          <label style={labelStyle}>
            Campaign name
            <input name="name" required defaultValue="Web99 | Ireland | Cold | See Before You Pay" style={fieldStyle} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
            <label style={labelStyle}>
              Daily budget (€)
              <input name="dailyBudgetEur" required type="number" min="1" step="1" defaultValue="30" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Public HTTPS image URL
              <input name="imageUrl" required type="url" placeholder="https://web99.ie/assets/ads/creative-01.jpg" style={fieldStyle} />
            </label>
          </div>

          <label style={labelStyle}>
            Primary text
            <textarea
              name="primaryText"
              required
              rows={5}
              defaultValue={"Get your business online for €99. We build your website first and send you the live link within 24 hours. You only pay after we build it and you like it. Dublin based. Includes domain + hosting for 1 year, business email, Facebook page and 3 months of content."}
              style={fieldStyle}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>
              Headline
              <input name="headline" required defaultValue="Get Your Business Online for €99" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Description
              <input name="description" required defaultValue="We build it first. You only pay if you like it." style={fieldStyle} />
            </label>
          </div>

          <label style={labelStyle}>
            Destination
            <input name="link" required type="url" defaultValue="https://www.web99.ie/" style={fieldStyle} />
          </label>

          <div>
            <button
              type="submit"
              disabled={busy}
              style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#5b3fe8", color: "white", fontWeight: 800, cursor: busy ? "wait" : "pointer" }}
            >
              {busy ? "Working…" : "Create campaign — PAUSED"}
            </button>
          </div>
        </form>
      </section>

      <section style={{ padding: 22, border: "1px solid #e2dfeb", borderRadius: 16, background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Campaigns</h2>
            <p style={{ color: "#666173", marginBottom: 0 }}>
              Launching is {data?.allowLaunch ? "enabled" : "locked at server level"}.
            </p>
          </div>
          <button onClick={() => void load()} disabled={busy} style={{ ...fieldStyle, width: "auto", cursor: "pointer" }}>
            Refresh
          </button>
        </div>

        <div style={{ display: "grid", gap: 9, marginTop: 18 }}>
          {campaigns.length === 0 ? <p>No campaigns found.</p> : null}
          {campaigns.map((campaign) => {
            const active = campaign.status === "ACTIVE";
            return (
              <div key={campaign.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 15, alignItems: "center", padding: 14, border: "1px solid #ece9f2", borderRadius: 12 }}>
                <div>
                  <strong>{campaign.name}</strong>
                  <div style={{ color: "#777181", fontSize: 13, marginTop: 4 }}>
                    {campaign.objective || "—"} · {campaign.effective_status || campaign.status || "—"} · {campaign.id}
                  </div>
                </div>
                <button
                  disabled={busy || (!active && !data?.allowLaunch)}
                  onClick={() => void setStatus(campaign.id, active ? "PAUSED" : "ACTIVE")}
                  style={{ border: 0, borderRadius: 9, padding: "9px 12px", fontWeight: 800, cursor: "pointer", background: active ? "#fff0f0" : "#eeeaff", color: active ? "#8a1111" : "#5138cf" }}
                >
                  {active ? "Pause" : "Launch"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 14, background: "white", border: "1px solid #e2dfeb" }}>
      <div style={{ color: "#777181", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ marginTop: 7, fontSize: 20, fontWeight: 850, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}
