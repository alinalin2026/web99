"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function Actions({
  id,
  state,
  previewUrl,
  hasEmail,
  hasPlan,
}: {
  id: string;
  state: string;
  previewUrl: string | null;
  hasEmail: boolean;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steer, setSteer] = useState("");

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      start(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const working = busy !== null || pending;

  return (
    <div className="card">
      {error && (
        <p style={{ color: "var(--red)", margin: "0 0 12px" }}>
          <strong>Didn't work:</strong> {error}
        </p>
      )}

      {state === "ready" && !hasPlan && (
        <>
          <p style={{ margin: "0 0 14px" }}>
            <strong>This is a confirmed lead.</strong> Claude has the full conversation,
            but no build plan has been made yet.
          </p>
          <button className="btn" disabled={working} onClick={() => run("makePlan")}>
            {busy === "makePlan" ? "Claude is making the plan…" : "Make the plan"}
          </button>
        </>
      )}

      {state === "ready" && hasPlan && (
        <>
          <p style={{ margin: "0 0 14px" }}>
            <strong>Read the plan below.</strong> When you're happy with it, this button
            hands that approved plan to OpenAI. GPT-5.6 builds the complete website,
            GPT Image 2 makes the logo/visuals, and the finished preview is pushed to its
            Web99 subdomain.
          </p>
          <div className="row">
            <button
              className="btn"
              disabled={working}
              onClick={() => run("buildAndPublish", { steer })}
            >
              {busy === "buildAndPublish" ? "Building + publishing…" : "Build + publish preview"}
            </button>
            <button
              className="btn btn--ghost"
              disabled={working}
              onClick={() => run("makePlan", { steer })}
            >
              {busy === "makePlan" ? "Re-making plan…" : "Re-make the plan"}
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <label htmlFor="steer">
              Anything you want changed before the next step? (optional)
            </label>
            <textarea
              id="steer"
              rows={3}
              value={steer}
              onChange={(e) => setSteer(e.target.value)}
              placeholder="Make it less corporate. Put the phone number first. Use a warmer look."
            />
          </div>
        </>
      )}

      {state === "analysing" && (
        <p className="muted" style={{ margin: 0 }}>Claude is turning the chat into a build plan.</p>
      )}

      {state === "generating" && (
        <p className="muted" style={{ margin: 0 }}>
          OpenAI is building the website and its visual assets. This can take a little while.
        </p>
      )}

      {state === "review" && (
        <>
          <p style={{ margin: "0 0 14px" }}>
            <strong>Legacy/manual review state.</strong> You can publish this build or rebuild it.
          </p>
          <div className="row">
            <button className="btn" disabled={working} onClick={() => run("approve")}>
              {busy === "approve" ? "Publishing…" : "Approve and publish"}
            </button>
            <button
              className="btn btn--ghost"
              disabled={working}
              onClick={() => run("rebuild", { steer })}
            >
              {busy === "rebuild" ? "Rebuilding…" : "Build it again"}
            </button>
            <button
              className="btn btn--danger"
              disabled={working}
              onClick={() => run("reject", { steer })}
            >
              Drop this one
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <label htmlFor="steer">Anything to change on the rebuild?</label>
            <textarea
              id="steer"
              rows={3}
              value={steer}
              onChange={(e) => setSteer(e.target.value)}
            />
          </div>
        </>
      )}

      {state === "live" && (
        <>
          <p style={{ margin: "0 0 14px" }}>
            Preview published{" "}
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noreferrer">
                {previewUrl}
              </a>
            )}
            . The customer has <strong>not</strong> been emailed yet.
          </p>
          <div className="row">
            <button
              className="btn"
              disabled={working || !hasEmail}
              onClick={() => run("sendPreview")}
            >
              {busy === "sendPreview" ? "Sending…" : "Send it to them"}
            </button>
            {!hasEmail && <span className="muted">No email address on this order.</span>}
          </div>
        </>
      )}

      {state === "sent" && (
        <p style={{ margin: 0 }}>
          Sent. Waiting on them.{" "}
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer">View the site</a>
          )}
        </p>
      )}

      {state === "won" && (
        <p style={{ margin: 0 }}>
          <strong>Paid.</strong>{" "}
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer">View the site</a>
          )}
        </p>
      )}

      {state === "collecting" && (
        <p className="muted" style={{ margin: 0 }}>Sarah is still talking to them.</p>
      )}

      {state === "failed" && (
        <>
          <p style={{ margin: "0 0 14px" }}>
            The last {hasPlan ? "build" : "planning"} attempt failed. The lead and chat are still here.
          </p>
          <button
            className="btn"
            disabled={working}
            onClick={() => run(hasPlan ? "buildAndPublish" : "makePlan", { steer })}
          >
            {working ? "Retrying…" : hasPlan ? "Retry build + publish" : "Retry plan"}
          </button>
        </>
      )}
    </div>
  );
}
