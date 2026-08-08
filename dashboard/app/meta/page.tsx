import MetaManager from "./MetaManager";

export const dynamic = "force-dynamic";

export default function MetaAdsPage() {
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 20px 70px" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: "#5b3fe8", fontWeight: 800, fontSize: 13, letterSpacing: ".05em" }}>
          WEB99 OPERATIONS
        </p>
        <h1 style={{ margin: "7px 0 8px", fontSize: "clamp(32px,5vw,52px)", lineHeight: 1.02 }}>
          Meta Ads Manager
        </h1>
        <p style={{ margin: 0, color: "#666173", maxWidth: 760, lineHeight: 1.6 }}>
          Read live account performance, create Web99 campaigns in a paused state, and explicitly launch or pause campaigns from the protected dashboard.
        </p>
      </div>

      <MetaManager />
    </main>
  );
}
