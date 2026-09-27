"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import type { EmailAttachmentRow, EmailRow, ThreadSummary } from "@/lib/db";

type EmailWithAttachments = EmailRow & { attachments: EmailAttachmentRow[] };

function ago(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return mins < 1 ? "now" : `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function addressLabel(raw: string) {
  const match = raw.match(/^"?([^"<]*)"?\s*<[^>]+>$/);
  const name = match?.[1]?.trim();
  return name || raw;
}

/** The customer's address, regardless of which side sent the last message. */
function replyTarget(email: EmailRow) {
  return email.direction === "inbound" ? email.from_email : email.to_email;
}

async function api(id: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/orders/${id}/emails${qs ? `?${qs}` : ""}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

async function post(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/orders/${id}/emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export default function Inbox({ id }: { id: string }) {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailWithAttachments[] | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ good: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api(id, {})
      .then((json) => { if (!cancelled) setThreads(json.threads ?? []); })
      .catch((err) => { if (!cancelled) setLoadError((err as Error).message); });
    return () => { cancelled = true; };
  }, [id]);

  const unreadTotal = (threads ?? []).reduce((n, t) => n + t.unread, 0);

  async function openThreadId(threadId: string) {
    setOpenThread(threadId);
    setEmails(null);
    setReplyBody("");
    setNote(null);
    try {
      const json = await api(id, { thread: threadId });
      setEmails(json.emails ?? []);
      // The GET call marks it read server-side; reflect that locally too.
      setThreads((prev) => prev?.map((t) => (t.thread_id === threadId ? { ...t, unread: 0 } : t)) ?? prev);
    } catch (err) {
      setNote({ good: false, text: (err as Error).message });
    }
  }

  async function sendReply() {
    if (!emails?.length || !replyBody.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      const last = emails[emails.length - 1];
      await post(id, { action: "reply", emailId: last.id, body: replyBody });
      setReplyBody("");
      setNote({ good: true, text: "Reply sent." });
      const json = await api(id, { thread: openThread! });
      setEmails(json.emails ?? []);
    } catch (err) {
      setNote({ good: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="project-info panel" open={unreadTotal > 0}>
      <summary>
        <b>Inbox</b>
        <span>{threads === null ? "Loading…" : `${threads.length} thread${threads.length === 1 ? "" : "s"}${unreadTotal ? ` · ${unreadTotal} unread` : ""}`}</span>
      </summary>

      <div style={{ borderTop: "1px solid var(--line)" }}>
        {loadError && <div className="inline-error" style={{ margin: 14 }}>{loadError}</div>}

        {!openThread && (
          <div>
            {threads?.length === 0 && (
              <div className="empty"><b>No correspondence yet.</b><p>Emails to and from this customer will show up here.</p></div>
            )}
            {threads?.map((t) => (
              <button
                key={t.thread_id}
                onClick={() => openThreadId(t.thread_id)}
                style={{
                  display: "flex", width: "100%", textAlign: "left", gap: 10, alignItems: "flex-start",
                  padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "none", border: "0",
                  borderBottomWidth: 1, cursor: "pointer",
                }}
              >
                <span className={`status-dot ${t.unread ? "blue" : "grey"}`} style={{ marginTop: 5 }} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <b style={{ fontSize: 13, fontWeight: t.unread ? 800 : 700 }}>{addressLabel(t.from_email)}</b>
                    <small className="muted" style={{ fontSize: 10, whiteSpace: "nowrap" }}>{ago(t.last_at)}</small>
                  </span>
                  <b style={{ display: "block", fontSize: 12, fontWeight: t.unread ? 750 : 500, margin: "2px 0" }}>{t.subject || "(no subject)"}</b>
                  <span className="muted" style={{ fontSize: 11, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.preview}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {openThread && (
          <div style={{ padding: 14 }}>
            <button className="icon-btn" onClick={() => setOpenThread(null)} style={{ padding: "4px 0", marginBottom: 8 }}>← All threads</button>

            {emails === null && <p className="muted">Loading…</p>}

            <div style={{ display: "grid", gap: 10 }}>
              {emails?.map((e) => (
                <div key={e.id} className={`bubble ${e.direction === "outbound" ? "customer" : ""}`} style={{ maxWidth: "100%" }}>
                  <b>{e.direction === "outbound" ? "Sent" : addressLabel(e.from_email)} · {ago(e.created_at)}</b>
                  {e.html ? (
                    <div
                      style={{ fontSize: 13, marginTop: 4 }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(e.html, { FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"] }),
                      }}
                    />
                  ) : (
                    <p style={{ whiteSpace: "pre-wrap" }}>{e.text_body}</p>
                  )}
                  {e.attachments.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {e.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={`/control/api/email-attachments/${a.id}`}
                          style={{
                            fontSize: 11, textDecoration: "none", color: "inherit",
                            border: "1px solid var(--line)", borderRadius: 999,
                            padding: "3px 9px", display: "inline-block",
                          }}
                        >
                          📎 {a.filename}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {note && <div className={`toast ${note.good ? "good" : "bad"}`} style={{ marginTop: 12 }}>{note.text}</div>}

            {emails && emails.length > 0 && (
              <div className="email-editor" style={{ marginTop: 14 }}>
                <label>Reply</label>
                <textarea
                  className="big-editor"
                  style={{ minHeight: 110 }}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={`Reply to ${addressLabel(replyTarget(emails[emails.length - 1]))}…`}
                />
                <div className="button-row">
                  <button className="btn" disabled={busy || !replyBody.trim()} onClick={sendReply}>
                    {busy ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
