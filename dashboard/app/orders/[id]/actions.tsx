"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/* The gate, as a set of buttons.

   Approve is the only thing that puts a site in front of a customer, and
   sendPreview is the only thing that emails them. Both are deliberately one
   click and clearly labelled — a reviewer who is unsure should be able to hit
   "Build it again" instead without feeling like they've broken a process. */

export default function Actions({
  id,
  state,
  previewUrl,
  hasEmail,
}: {
  id: string;
  state: string;
  previewUrl: string | null;
  hasEmail: boolean;
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

      {state === "review" && (
        <>
          <p style={{ margin: "0 0 14px" }}>
            <strong>This has not been seen by the customer.</strong> Nothing is sent
            and nothing is public until you approve it.
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
            <label htmlFor="steer">
              Anything to change on the rebuild? (optional — goes to the builder)
            </label>
            <textarea
              id="steer"
              rows={3}
              value={steer}
              onChange={(e) => setSteer(e.target.value)}
              placeholder="Too corporate for a barber. Hours should be in the header. Drop the second section."
            />
          </div>
        </>
      )}

      {state === "live" && (
        <>
          <p style={{ margin: "0 0 14px" }}>
            Published{" "}
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
            <a href={previewUrl} target="_blank" rel="noreferrer">
              View the site
            </a>
          )}
        </p>
      )}

      {state === "won" && (
        <p style={{ margin: 0 }}>
          <strong>Paid.</strong>{" "}
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              View the site
            </a>
          )}
        </p>
      )}

      {(state === "collecting" ||
        state === "ready" ||
        state === "analysing" ||
        state === "generating") && (
        <p className="muted" style={{ margin: 0 }}>
          {state === "collecting"
            ? "Sarah is still talking to them."
            : "Building. This page updates when it's done."}
        </p>
      )}

      {state === "failed" && (
        <div className="row">
          <button className="btn" disabled={working} onClick={() => run("rebuild", { steer })}>
            {busy === "rebuild" ? "Retrying…" : "Try again"}
          </button>
        </div>
      )}
    </div>
  );
}
