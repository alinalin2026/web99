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

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const [assets, events, versions] = await Promise.all([listAssets(id), listEvents(id), listVersions(id)]);
  const q = qualificationFor(order);
  const analysis = (order.analysis ?? {}) as Record<string, any>;
  const publishPending = Boolean(order.commit_sha?.startsWith("pending:github:"));
  const effectivePreviewUrl = publishPending && order.slug ? `/preview/${order.slug}` : order.preview_url;

  return (
    <main className="project-shell">
      <header className="project-header">
        <Link className="back-link" href={order.studio_copy ? "/?tab=studio" : order.plan_text ? "/?tab=queue" : "/?tab=leads"}>← Back</Link>
        <div className="project-title-row">
          <div className="grow">
            <span className={`qual q-${q}`}>{q.replace("_", " ")}</span>
            <h1>{order.business_name || order.trade || "Unnamed project"}</h1>
            <p>{[order.trade, order.location].filter(Boolean).join(" · ") || "Sarah lead"}</p>
          </div>
          <span className={`project-state ${order.workflow_stage === "failed" ? "bad" : ""}`}>{order.workflow_stage.replaceAll("_", " ")}</span>
        </div>
      </header>

      {order.failure_reason && <div className="panel error-panel"><b>Last step failed</b><p>{order.failure_reason}</p></div>}
      {publishPending && (
        <div className="panel">
          <b>Website ready · publishing pending</b>
          <p>The finished build is safe in Web99 and can be previewed now. GitHub publishing will be retried separately, so this does not block your review.</p>
        </div>
      )}

      <StudioEditor
        id={order.id}
        planText={order.plan_text}
        studioCopy={order.studio_copy}
        assets={assets}
        previewUrl={effectivePreviewUrl}
        email={publishPending ? null : order.email}
        workflowStage={order.workflow_stage}
        state={order.state}
        autopilot={order.autopilot}
        versions={versions}
      />

      <details className="project-info panel">
        <summary><b>Project memory</b><span>Business facts the Web99 Agent can use</span></summary>
        <div className="info-grid">
          <div><span>Business</span><b>{order.business_name || "—"}</b></div>
          <div><span>Trade</span><b>{order.trade || "—"}</b></div>
          <div><span>Location</span><b>{order.location || "—"}</b></div>
          <div><span>Email</span><b>{order.email || "—"}</b></div>
          <div><span>Phone</span><b>{order.phone || "—"}</b></div>
          <div><span>Autopilot</span><b>{order.autopilot}</b></div>
        </div>
        {order.brief && <pre>{JSON.stringify(order.brief, null, 2)}</pre>}
      </details>

      {Array.isArray(analysis.underSold) && analysis.underSold.length > 0 && (
        <details className="project-info panel">
          <summary><b>Under-sold points</b><span>What the Web99 Agent spotted</span></summary>
          <div className="insight-list">{analysis.underSold.map((u: any, i: number) => <div key={i}><b>{u.fact}</b><p>{u.whereItGoes}{u.why ? ` — ${u.why}` : ""}</p></div>)}</div>
        </details>
      )}

      <details className="project-info panel">
        <summary><b>Sarah chat</b><span>{order.conversation.length} messages</span></summary>
        <div className="full-chat">{order.conversation.map((t, i) => <div key={i} className={`bubble ${t.role === "user" ? "customer" : "sarah"}`}><b>{t.role === "user" ? "Customer" : "Sarah"}</b><p>{t.content}</p></div>)}</div>
      </details>

      {order.qa_report && (
        <details className="project-info panel">
          <summary><b>QA report</b><span>OpenAI pre-flight + auto-repair</span></summary>
          <pre>{JSON.stringify(order.qa_report, null, 2)}</pre>
        </details>
      )}

      <details className="project-info panel">
        <summary><b>Work history</b><span>{events.length} updates</span></summary>
        <div className="timeline">{events.map((e) => <div key={e.id}><span className={`status-dot ${e.kind === "error" ? "red" : e.kind.includes("ready") || e.kind === "deployed" ? "green" : "grey"}`} /><p><b>{e.detail?.message || e.kind.replaceAll("_", " ")}</b><small>{ago(e.created_at)} · {e.kind}</small></p></div>)}</div>
      </details>
    </main>
  );
}
