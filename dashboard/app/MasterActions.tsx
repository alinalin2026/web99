"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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

export function ActionButton({
  id,
  action,
  label,
  busyLabel,
  className = "btn",
  confirmText,
  extra = {},
}: {
  id: string;
  action: string;
  label: string;
  busyLabel?: string;
  className?: string;
  confirmText?: string;
  extra?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setError("");
    try { await post(id, { action, ...extra }); router.refresh(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <span className="action-wrap">
      <button className={className} disabled={busy} onClick={run}>{busy ? busyLabel ?? "Working…" : label}</button>
      {error && <small className="action-error">{error}</small>}
    </span>
  );
}

export function AutopilotSelect({ id, value }: { id: string; value: string }) {
  const router = useRouter();
  const [mode, setMode] = useState(value || "assisted");
  const [busy, start] = useTransition();
  return (
    <label className="mini-field">
      <span>Autopilot</span>
      <select
        value={mode}
        disabled={busy}
        onChange={(e) => {
          const next = e.target.value;
          setMode(next);
          start(async () => { await post(id, { action: "setAutopilot", mode: next }); router.refresh(); });
        }}
      >
        <option value="manual">Manual</option>
        <option value="assisted">Assisted</option>
        <option value="full">Full auto</option>
      </select>
    </label>
  );
}

export function LeadControls({ id, email, businessName }: { id: string; email: string | null; businessName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(`Web99 — ${businessName}`);
  const [message, setMessage] = useState(`Hi,\n\nThanks for chatting with Sarah. I just wanted to follow up about your website.\n\nAlan\nWeb99.ie`);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action); setNote("");
    try {
      await post(id, { action, ...extra });
      setNote(action === "sendCustom" ? "Email sent." : "Done.");
      if (action === "delete") setOpen(false);
      router.refresh();
    } catch (err) { setNote((err as Error).message); }
    finally { setBusy(null); }
  }

  return (
    <div className="lead-controls">
      <div className="button-row">
        <button className="btn" disabled={!!busy} onClick={() => run("queue")}>{busy === "queue" ? "Queuing…" : "Queue"}</button>
        <button className="btn btn--ghost" disabled={!email || !!busy} onClick={() => setOpen((v) => !v)}>Email</button>
        <button
          className="icon-btn danger"
          disabled={!!busy}
          aria-label="Delete lead"
          onClick={() => window.confirm(`Delete ${businessName}?`) && run("delete")}
        >Delete</button>
      </div>
      {open && (
        <div className="email-editor">
          <label>Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
          <label>Message<textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
          <button className="btn" disabled={!!busy} onClick={() => run("sendCustom", { subject, message })}>
            {busy === "sendCustom" ? "Sending…" : "Send email"}
          </button>
        </div>
      )}
      {note && <small className={note === "Email sent." || note === "Done." ? "success-note" : "action-error"}>{note}</small>}
    </div>
  );
}
