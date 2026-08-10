"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProjectAsset } from "@/lib/db";

const VISUAL_STYLES = [
  "Auto",
  "Modern Local",
  "Premium Dark",
  "Warm Boutique",
  "Bold Industrial",
  "Minimal Editorial",
  "Classic Professional",
  "Colourful Creative",
  "Luxury",
  "Tech Futuristic",
  "Friendly Family",
  "Restaurant Hospitality",
  "Ecommerce Product",
];

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

function humanStage(stage: string, state: string, previewUrl: string | null) {
  if (previewUrl) return "Ready to review";
  if (["job_failed", "failed"].includes(stage) || state === "failed") return "Needs you";
  if (["qa", "checking", "repairing"].includes(stage)) return "Checking";
  if (["queued_build", "studio_ready", "creating", "building", "fixing"].includes(stage) || state === "generating") return "Building";
  if (["queued", "planning"].includes(stage) || state === "analysing") return "Planning";
  if (stage === "plan_ready") return "Direction ready";
  return "Ready";
}

export default function StudioEditor({
  id,
  planText,
  studioCopy: _studioCopy,
  assets: _assets,
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
  const [notice, setNotice] = useState("");
  const [plan, setPlan] = useState(planText ?? "");
  const [direction, setDirection] = useState("");
  const [style, setStyle] = useState("Auto");
  const [fix, setFix] = useState("");
  const [autoBuild, setAutoBuild] = useState(autopilot === "full");

  async function run(key: string, body: Record<string, unknown>, message = "Done") {
    setBusy(key); setError(""); setNotice("");
    try {
      await post(id, body);
      setNotice(message);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const working = !!busy || pending;
  const stage = humanStage(workflowStage, state, previewUrl);
  const buildInProgress = !previewUrl && [
    "queued_build", "studio_ready", "creating", "building", "qa", "checking", "repairing", "fixing"
  ].includes(workflowStage);

  const buildSteer = [
    `VISUAL STYLE: ${style}. ${style === "Auto" ? "Choose the strongest Web99 style for this business." : `Follow the ${style} style family consistently.`}`,
    direction.trim(),
  ].filter(Boolean).join("\n\n");

  return (
    <div className="studio-editor">
      {(error || notice) && <div className={`toast ${error ? "bad" : "good"}`}>{error || notice}</div>}

      <section className="project-actions panel sticky-actions">
        <div className="action-summary">
          <span className="eyebrow">STATUS</span>
          <b>{stage}</b>
        </div>

        {!planText && !previewUrl && !buildInProgress && (
          <button className="btn" disabled={working} onClick={() => run("next", { action: "runNext" }, "Planning started — you can close this page") }>
            {busy === "next" ? "Starting…" : "Prepare direction"}
          </button>
        )}

        {previewUrl && (
          <a className="btn" href={previewUrl} target="_blank" rel="noreferrer">Open finished website</a>
        )}

        <label className="mini-field" style={{ marginTop: 12 }}>
          <span>Build automatically</span>
          <input
            type="checkbox"
            checked={autoBuild}
            disabled={working}
            onChange={(e) => {
              const checked = e.target.checked;
              setAutoBuild(checked);
              run("mode", { action: "setAutopilot", mode: checked ? "full" : "assisted" }, checked ? "Automatic builds enabled" : "Approval before build enabled");
            }}
          />
        </label>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {autoBuild ? "Sarah can hand complete leads straight to the factory." : "You approve the direction once; Web99 handles everything after that."}
        </p>
      </section>

      {planText && !previewUrl && !buildInProgress && (
        <section className="editor-section panel">
          <div className="editor-body">
            <span className="eyebrow">30-SECOND REVIEW</span>
            <h2 style={{ marginTop: 6 }}>Website direction</h2>
            <p className="muted">This is the only approval before the build. Pick the feel, change anything you care about, then Web99 handles copy, logo, images, layout, checks and deployment.</p>
            <textarea className="big-editor" rows={18} value={plan} onChange={(e) => setPlan(e.target.value)} />

            <label style={{ display: "block", marginTop: 16 }}>
              <b>Style</b>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                style={{ width: "100%", minHeight: 48, marginTop: 8, borderRadius: 12, padding: "0 12px" }}
              >
                {VISUAL_STYLES.map((name) => <option value={name} key={name}>{name}</option>)}
              </select>
              <small className="muted" style={{ display: "block", marginTop: 6 }}>Auto is the default. We can keep adding styles to this list.</small>
            </label>

            <label style={{ display: "block", marginTop: 16 }}>
              <b>Anything you want changed?</b>
              <textarea
                rows={4}
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                placeholder="Less corporate. Bigger phone button. Warmer look. Make the main service obvious…"
              />
            </label>

            <button
              className="btn"
              style={{ width: "100%", marginTop: 16 }}
              disabled={working || !plan.trim()}
              onClick={() => run("approveBuild", { action: "approveBuild", plan, steer: buildSteer }, "Approved. Building in the background — you can close the browser")}
            >
              {busy === "approveBuild" ? "Starting build…" : "Approve & Build"}
            </button>
          </div>
        </section>
      )}

      {buildInProgress && (
        <section className="panel" style={{ textAlign: "center", padding: "34px 24px" }}>
          <h2>{stage}…</h2>
          <p className="muted">Web99 is handling the copy, logo, visuals, website build and checks in the background. You can close the browser.</p>
        </section>
      )}

      {previewUrl && (
        <section className="editor-section panel">
          <div className="editor-body">
            <span className="eyebrow">FINAL REVIEW</span>
            <h2 style={{ marginTop: 6 }}>What do you want to do?</h2>

            <div className="button-row" style={{ marginTop: 14 }}>
              <a className="btn" href={previewUrl} target="_blank" rel="noreferrer">Looks good — view it</a>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={async () => {
                  const url = previewUrl.startsWith("http") ? previewUrl : `${window.location.origin}${previewUrl}`;
                  await navigator.clipboard.writeText(url);
                  setNotice("Customer link copied");
                }}
              >
                Copy customer link
              </button>
              {email && (
                <button className="btn btn--ghost" disabled={working} onClick={() => run("sendPreview", { action: "sendPreview" }, "Sent to customer") }>
                  {busy === "sendPreview" ? "Sending…" : "Send to customer"}
                </button>
              )}
            </div>

            <div className="fix-box" style={{ marginTop: 22 }}>
              <label>
                <b>Fix something</b>
                <textarea
                  rows={5}
                  value={fix}
                  onChange={(e) => setFix(e.target.value)}
                  placeholder="Change the hero photo, shorten the headline, make it warmer, move the phone button higher…"
                />
              </label>
              <button className="btn" disabled={working || !fix.trim()} onClick={() => run("fix", { action: "fix", instruction: fix }, "Change queued — Web99 is fixing it in the background") }>
                {busy === "fix" ? "Queuing…" : "Fix it"}
              </button>
            </div>
          </div>
        </section>
      )}

      {versions.length > 0 && (
        <details className="editor-section panel">
          <summary><span><b>Previous versions</b><small>Only open this if you need to go back</small></span><span className="section-state ready">{versions.length}</span></summary>
          <div className="version-list">
            {versions.map((v) => (
              <div className="version-row" key={v.version_no}>
                <div><b>v{v.version_no}</b><small>{v.note || "Website build"} · {new Date(v.created_at).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" })}</small></div>
                <button className="tiny-btn" disabled={working} onClick={() => window.confirm(`Restore v${v.version_no}?`) && run(`restore-${v.version_no}`, { action: "restoreVersion", version: v.version_no }, `Restored v${v.version_no}`)}>Restore</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
