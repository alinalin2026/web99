"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProjectAsset } from "@/lib/db";

async function post(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/orders/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export default function StudioEditor({
  id,
  planText,
  studioCopy,
  assets,
  previewUrl,
  email,
  workflowStage,
  state,
  autopilot,
  versions,
}: {
  id: string;
  planText: string | null;
  studioCopy: string | null;
  assets: ProjectAsset[];
  previewUrl: string | null;
  email: string | null;
  workflowStage: string;
  state: string;
  autopilot: string;
  versions: { version_no: number; note: string | null; created_at: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [plan, setPlan] = useState(planText ?? "");
  const [copy, setCopy] = useState(studioCopy ?? "");
  const [fix, setFix] = useState("");
  const [mode, setMode] = useState(autopilot || "assisted");
  const initialPrompts = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a.prompt])), [assets]);
  const [prompts, setPrompts] = useState<Record<string, string>>(initialPrompts);

  async function run(key: string, body: Record<string, unknown>) {
    setBusy(key); setError(""); setSaved("");
    try {
      await post(id, body);
      setSaved("Saved");
      startTransition(() => router.refresh());
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(null); }
  }

  const working = !!busy || pending;
  const imageReady = assets.filter((a) => a.status === "ready").length;

  return (
    <div className="studio-editor">
      {(error || saved) && <div className={`toast ${error ? "bad" : "good"}`}>{error || saved}</div>}

      <section className="project-actions panel sticky-actions">
        <div className="action-summary">
          <span className="eyebrow">CURRENT STEP</span>
          <b>{workflowStage.replaceAll("_", " ")}</b>
        </div>
        <div className="button-row">
          <button className="btn" disabled={working} onClick={() => run("next", { action: "runNext" })}>{busy === "next" ? "Running…" : "Run next step"}</button>
          {previewUrl && <a className="btn btn--ghost" href={previewUrl} target="_blank" rel="noreferrer">See site</a>}
        </div>
        <label className="mini-field full-select"><span>Autopilot</span><select value={mode} disabled={working} onChange={(e) => { const v = e.target.value; setMode(v); run("mode", { action: "setAutopilot", mode: v }); }}><option value="manual">Manual — stop at every step</option><option value="assisted">Assisted — approve plan, automate the rest</option><option value="full">Full auto — build the whole demo</option></select></label>
      </section>

      {planText && (
        <details className="editor-section panel" open={workflowStage === "plan_ready"}>
          <summary><span><b>1. Claude’s build plan</b><small>Editable · 500–600 words</small></span><span className="section-state ready">Ready</span></summary>
          <div className="editor-body">
            <textarea className="big-editor" rows={22} value={plan} onChange={(e) => setPlan(e.target.value)} />
            <div className="button-row">
              <button className="btn btn--ghost" disabled={working} onClick={() => run("savePlan", { action: "savePlan", plan })}>{busy === "savePlan" ? "Saving…" : "Save plan"}</button>
              <button className="btn" disabled={working} onClick={() => run("approvePlan", { action: "approvePlan", plan })}>{busy === "approvePlan" ? "Approving…" : "Approve plan"}</button>
            </div>
          </div>
        </details>
      )}

      <details className="editor-section panel" open={workflowStage === "studio_ready" || workflowStage === "creating"}>
        <summary><span><b>2. Website copy</b><small>{studioCopy ? "Claude-written · fully editable" : "Generated after plan approval"}</small></span><span className={`section-state ${studioCopy ? "ready" : "waiting"}`}>{studioCopy ? "Ready" : "Waiting"}</span></summary>
        <div className="editor-body">
          {studioCopy ? <><textarea className="big-editor" rows={22} value={copy} onChange={(e) => setCopy(e.target.value)} /><button className="btn btn--ghost" disabled={working} onClick={() => run("saveCopy", { action: "saveCopy", copy })}>{busy === "saveCopy" ? "Saving…" : "Save copy"}</button></> : <p className="muted">Approve the plan and Claude will write the finished page copy here.</p>}
        </div>
      </details>

      <details className="editor-section panel" open={workflowStage === "studio_ready"}>
        <summary><span><b>3. Images</b><small>{assets.length ? `${imageReady}/${assets.length} generated` : "Claude decides what the demo needs"}</small></span><span className={`section-state ${assets.length && imageReady === assets.length ? "ready" : "waiting"}`}>{assets.length && imageReady === assets.length ? "Ready" : assets.length ? "Prompts" : "None"}</span></summary>
        <div className="editor-body">
          {assets.length === 0 ? <p className="muted">No generated visuals are required for this build.</p> : <>
            <div className="button-row image-all"><button className="btn" disabled={working} onClick={() => run("generateAll", { action: "generateAll" })}>{busy === "generateAll" ? "Generating…" : `Generate all ${assets.length}`}</button></div>
            <div className="asset-stack">
              {assets.map((asset) => (
                <details className={`asset-card ${asset.status === "ready" ? "asset-ready" : ""}`} key={asset.id} open={asset.status !== "ready"}>
                  <summary><div><b>{asset.title}</b><small>{asset.kind} · {asset.size || "auto"}</small></div><span className={`asset-status s-${asset.status}`}>{asset.status.replaceAll("_", " ")}</span></summary>
                  <div className="asset-body">
                    {asset.data_url && <img className="asset-preview" src={asset.data_url} alt={`${asset.title} generated preview`} />}
                    <label>Prompt<textarea rows={8} value={prompts[asset.id] ?? asset.prompt} onChange={(e) => setPrompts((p) => ({ ...p, [asset.id]: e.target.value }))} /></label>
                    {asset.error && <p className="inline-error">{asset.error}</p>}
                    <div className="button-row">
                      <button className="btn btn--ghost" disabled={working} onClick={() => run(`save-${asset.id}`, { action: "saveAssetPrompt", assetId: asset.id, prompt: prompts[asset.id] })}>Save prompt</button>
                      <button className="btn" disabled={working} onClick={() => run(`image-${asset.id}`, { action: "generateAsset", assetId: asset.id, prompt: prompts[asset.id] })}>{busy === `image-${asset.id}` ? "Generating…" : asset.status === "ready" ? "Regenerate" : "Send!"}</button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </>}
        </div>
      </details>

      <details className="editor-section panel" open={["building", "qa", "ready"].includes(workflowStage) || state === "live"}>
        <summary><span><b>4. Build & deploy</b><small>Claude Code → QA → preview</small></span><span className={`section-state ${previewUrl ? "ready" : "waiting"}`}>{previewUrl ? "Deployed" : workflowStage === "building" ? "Building" : "Waiting"}</span></summary>
        <div className="editor-body">
          <div className="button-row">
            {!previewUrl && <button className="btn" disabled={working || (assets.length > 0 && imageReady !== assets.length)} onClick={() => run("build", { action: "startBuild" })}>{busy === "build" ? "Building…" : "Start build"}</button>}
            {previewUrl && <a className="btn" href={previewUrl} target="_blank" rel="noreferrer">Open website</a>}
            {previewUrl && email && <button className="btn btn--ghost" disabled={working} onClick={() => run("sendPreview", { action: "sendPreview" })}>{busy === "sendPreview" ? "Sending…" : "Send to customer"}</button>}
          </div>
          {previewUrl && <div className="fix-box"><label>Tell Claude what to change<textarea rows={5} value={fix} onChange={(e) => setFix(e.target.value)} placeholder="Make the hero brighter, move the phone button higher, make the logo smaller…" /></label><button className="btn" disabled={working || !fix.trim()} onClick={() => run("fix", { action: "fix", instruction: fix })}>{busy === "fix" ? "Applying…" : "Fix it & redeploy"}</button></div>}
        </div>
      </details>

      {versions.length > 0 && (
        <details className="editor-section panel">
          <summary><span><b>Versions</b><small>Every deploy is recoverable</small></span><span className="section-state ready">{versions.length}</span></summary>
          <div className="version-list">{versions.map((v) => <div className="version-row" key={v.version_no}><div><b>v{v.version_no}</b><small>{v.note || "Website build"} · {new Date(v.created_at).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" })}</small></div><button className="tiny-btn" disabled={working} onClick={() => window.confirm(`Restore v${v.version_no}?`) && run(`restore-${v.version_no}`, { action: "restoreVersion", version: v.version_no })}>Restore</button></div>)}</div>
        </details>
      )}
    </div>
  );
}
