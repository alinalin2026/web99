"use client";

import { useEffect, useRef, useState } from "react";

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

export default function Composer() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const [previewHtml, setPreviewHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!subject.trim() && !message.trim()) {
      setPreviewHtml("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      void jsonFetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || "(no subject yet)",
          message: message.trim() || "Start typing your message on the left…",
          ctaLabel,
          ctaUrl,
          preview: true,
        }),
      })
        .then((res) => setPreviewHtml(res.html))
        .catch(() => {
          /* Preview is best-effort — a bad request here shouldn't block typing. */
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [subject, message, ctaLabel, ctaUrl]);

  const recipientCount = to.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).length;
  const canSend = recipientCount > 0 && subject.trim().length > 0 && message.trim().length > 0;

  async function handleSend() {
    const ok = window.confirm(
      `Send this email to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"} right now?`
    );
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await jsonFetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, message, ctaLabel, ctaUrl }),
      });
      setNotice(`Sent to ${res.sentTo.join(", ")}. Resend id: ${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {error ? (
        <div style={{ padding: 14, borderRadius: 10, background: "#fff0f0", color: "#8a1111" }}>{error}</div>
      ) : null}
      {notice ? (
        <div style={{ padding: 14, borderRadius: 10, background: "#edf9ef", color: "#165d26" }}>{notice}</div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }}>
        <section style={{ padding: 22, border: "1px solid #e2dfeb", borderRadius: 16, background: "white", display: "grid", gap: 14 }}>
          <label style={labelStyle}>
            To
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="joe@example.com, mary@example.com"
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              placeholder={"Hi there,\n\nWrite your message here. Leave a blank line between paragraphs."}
              style={fieldStyle}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>
              Button label (optional)
              <input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="See your website"
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Button link
              <input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://…"
                type="url"
                style={fieldStyle}
              />
            </label>
          </div>

          <div>
            <button
              type="button"
              disabled={!canSend || busy}
              onClick={() => void handleSend()}
              style={{
                border: 0,
                borderRadius: 10,
                padding: "12px 20px",
                background: !canSend || busy ? "#c9c2ee" : "#5b3fe8",
                color: "white",
                fontWeight: 800,
                cursor: !canSend || busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Sending…" : "Send"}
            </button>
            {!canSend ? (
              <span style={{ marginLeft: 12, fontSize: 13, color: "#8a8496" }}>
                Add at least one recipient, a subject and a message.
              </span>
            ) : null}
          </div>
        </section>

        <section style={{ padding: 22, border: "1px solid #e2dfeb", borderRadius: 16, background: "#faf8ff" }}>
          <p style={{ margin: "0 0 12px", color: "#5b3fe8", fontWeight: 800, fontSize: 13 }}>
            LIVE PREVIEW — WEB99 TEMPLATE
          </p>
          {previewHtml ? (
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              style={{ width: "100%", height: 640, border: "1px solid #e2dfeb", borderRadius: 12, background: "white" }}
            />
          ) : (
            <p style={{ color: "#8a8496" }}>Start typing a subject or message to see the preview.</p>
          )}
        </section>
      </div>
    </div>
  );
}
