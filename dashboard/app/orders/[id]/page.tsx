import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, listAssets, listEvents, listVersions, qualificationFor } from "@/lib/db";
import StudioEditor from "./StudioEditor";

export const dynamic = "force-dynamic";

function ago(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return mins < 1 ? "now" : `${mins}m ago`;
  const h = Math.floor(mins / 60); return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function humanStage(stage: string, state: string, hasPreview: boolean) {
  if (hasPreview || state === "live") return "Ready to review";
  if (["failed", "job_failed"].includes(stage) || state === "failed") return "Needs you";
  if (["qa", "checking", "repairing"].includes(stage)) return "Checking";
  if (["queued_build", "creating", "studio_ready", "building", "fixing"].includes(stage) || state === "generating") return "Building";
  if (["queued", "planning"].includes(stage) || state === "analysing") return "Planning";
  if (stage === "plan_ready") return "Direction ready";
  return "Ready";
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const [assets, events, versions] = await Promise.all([listAssets(id), listEvents(id), listVersions(id)]);
  const q = qualificationFor(order);
  const analysis = (order.analysis ?? {}) as Record<string, any>;
  const publishPending = Boolean(order.commit_sha?.startsWith("pending:github:"));
  const marketingUrl = (process.env.MARKETING_URL ?? "https://web99.ie").replace(/\/$/, "");
  const effectivePreviewUrl = order.slug && order.generated ? `${marketingUrl}/demo/${order.slug}` : null;
  const visibleStage = humanStage(order.workflow_stage, order.state, Boolean(effectivePreviewUrl));
  const usefulEvents = events.filter((e) => !["state_change", "workflow", "image_ready", "job_completed"].includes(e.kind));

  return (
    <main className="project-shell">
      <header className="project-header">
        <Link className="back-link" href={order.plan_text ? "/?tab=plan" : "/?tab=leads"}>← Back</Link>
        <div className="project-title-row">
          <div className="grow">
            <span className={`qual q-${q}`}>{q.replace("_", " ")}</span>
            <h1>{order.business_name || order.trade || "Unnamed project"}</h1>
            <p>{[order.trade, order.location].filter(Boolean).join(" · ") || "Sarah lead"}</p>
          </div>
          <span className={`project-state ${visibleStage === "Needs you" ? "bad" : ""}`}>{visibleStage}</span>
        </div>
      </header>

      {visibleStage === "Needs you" && order.failure_reason && <div className="panel error-panel"><b>Web99 needs you</b><p>{order.failure_reason}</p></div>}
      {order.state === "live" && (
        <div className="panel">
          <b>Website ready</b>
          <p>Review the finished site below. You can ask Web99 for a change or send it to the customer.</p>
        </div>
      )}
      {publishPending && (
        <div className="panel">
          <b>Backup mirror pending</b>
          <p>The finished website is safe on the Web99 server and can be reviewed now.</p>
        </div>
      )}

      <StudioEditor
        id={order.id}
        planText={order.plan_text}
        studioCopy={order.studio_copy}
        assets={assets}
        previewUrl={effectivePreviewUrl}
        email={order.email}
        workflowStage={order.workflow_stage}
        state={order.state}
        autopilot={order.autopilot}
        versions={versions}
      />

      <details className="project-info panel">
        <summary><b>Project memory</b><span>Business facts Web99 remembers</span></summary>
        <div className="info-grid">
          <div><span>Business</span><b>{order.business_name || "—"}</b></div>
          <div><span>Trade</span><b>{order.trade || "—"}</b></div>
          <div><span>Location</span><b>{order.location || "—"}</b></div>
          <div><span>Email</span><b>{order.email || "—"}</b></div>
          <div><span>Phone</span><b>{order.phone || "—"}</b></div>
          <div><span>Mode</span><b>{order.autopilot === "full" ? "Automatic" : "Approve once"}</b></div>
        </div>
        {order.brief && <pre>{JSON.stringify(order.brief, null, 2)}</pre>}
      </details>

      {Array.isArray(analysis.underSold) && analysis.underSold.length > 0 && (
        <details className="project-info panel">
          <summary><b>Good opportunities</b><span>What Web99 spotted</span></summary>
          <div className="insight-list">{analysis.underSold.map((u: any, i: number) => <div key={i}><b>{u.fact}</b><p>{u.whereItGoes}{u.why ? ` — ${u.why}` : ""}</p></div>)}</div>
        </details>
      )}

      <details className="project-info panel">
        <summary><b>Sarah chat</b><span>{order.conversation.length} messages</span></summary>
        <div className="full-chat">{order.conversation.map((t, i) => <div key={i} className={`bubble ${t.role === "user" ? "customer" : "sarah"}`}><b>{t.role === "user" ? "Customer" : "Sarah"}</b><p>{t.content}</p></div>)}</div>
      </details>

      {order.qa_report && (
        <details className="project-info panel">
          <summary><b>Checks</b><span>Only open if you want the technical detail</span></summary>
          <pre>{JSON.stringify(order.qa_report, null, 2)}</pre>
        </details>
      )}

      <details className="project-info panel">
        <summary><b>Work history</b><span>{usefulEvents.length} useful updates</span></summary>
        <div className="timeline">{usefulEvents.map((e) => <div key={e.id}><span className={`status-dot ${e.kind.includes("failed") || e.kind === "error" ? "red" : e.kind.includes("ready") || e.kind === "deployed" || e.kind === "build_approved" ? "green" : "grey"}`} /><p><b>{e.detail?.message || "Web99 update"}</b><small>{ago(e.created_at)}</small></p></div>)}</div>
      </details>
    </main>
  );
}
