"use client";

import { useState } from "react";
import { commercials } from "@/lib/capabilities";

/** Sticky bar shown the moment a preview reveals — on the quiz reveal step
    and on the saved /p/<id> page. Pass `previewId` directly when it's
    already known (a plain string is safe across the server/client
    boundary); pass `resolvePreviewId` from a client component when the
    save is still happening in the background, so the reveal itself never
    waits on a network round trip. */
export default function PreviewActionBar({
  previewId: knownPreviewId,
  resolvePreviewId,
}: {
  previewId?: string | null;
  resolvePreviewId?: () => Promise<string>;
}) {
  const [busy, setBusy] = useState<"buy" | "email" | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(): Promise<string> {
    if (knownPreviewId) return knownPreviewId;
    if (resolvePreviewId) return resolvePreviewId();
    throw new Error("No preview to act on yet");
  }

  async function onBuy() {
    setBusy("buy");
    setError(null);
    try {
      const previewId = await resolve();
      fetch("/api/preview-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId, kind: "buy_click" }),
      }).catch(() => {});
      const res = await fetch("/api/previews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      window.location.href = data.buyUrl;
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  async function onEmailSubmit() {
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setBusy("email");
    setError(null);
    try {
      const previewId = await resolve();
      const res = await fetch("/api/previews/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "#141033",
        color: "#fff",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        boxShadow: "0 2px 12px rgba(0,0,0,.25)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
        This is yours. <strong>{commercials.price}</strong>, live in 5 business days.
      </div>

      {!showEmail ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowEmail(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,.35)",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Email me this
          </button>
          <button
            onClick={onBuy}
            disabled={busy === "buy"}
            style={{
              background: "#5b3fe8",
              border: "none",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {busy === "buy" ? "One sec…" : `Take it — ${commercials.price}`}
          </button>
        </div>
      ) : sent ? (
        <div style={{ fontSize: 13, fontWeight: 600 }}>Sent — check your inbox.</div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="email"
            inputMode="email"
            placeholder="you@business.ie"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,.3)",
              background: "rgba(255,255,255,.08)",
              color: "#fff",
              fontSize: 14,
              minWidth: 0,
            }}
          />
          <button
            onClick={onEmailSubmit}
            disabled={busy === "email"}
            style={{
              background: "#5b3fe8",
              border: "none",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {busy === "email" ? "Sending…" : "Send"}
          </button>
        </div>
      )}

      {error && (
        <div style={{ width: "100%", fontSize: 12, color: "#ffb4b0" }}>{error}</div>
      )}
    </div>
  );
}
