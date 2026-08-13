"use client";

import { useMemo, useState } from "react";

export interface EmailOrderOption {
  id: string;
  label: string;
  email: string | null;
  businessName: string;
  previewUrl: string | null;
  done: boolean;
}

type Template = "custom" | "onTheWay" | "siteReady" | "nudge" | "paid";

const TEMPLATES: { key: Template; label: string; needs: string[] }[] = [
  { key: "custom", label: "Custom message", needs: ["subject", "message"] },
  { key: "onTheWay", label: "Your website is being built", needs: [] },
  { key: "siteReady", label: "Your website is ready to look at", needs: ["previewUrl"] },
  { key: "nudge", label: "Follow-up — did you see it?", needs: ["previewUrl"] },
  { key: "paid", label: "Payment received — what happens now", needs: ["liveUrl", "chooseUrl"] },
];

export function EmailComposer({ orders }: { orders: EmailOrderOption[] }) {
  const leads = useMemo(() => orders.filter((o) => !o.done), [orders]);
  const done = useMemo(() => orders.filter((o) => o.done), [orders]);

  const [selection, setSelection] = useState<string>("manual");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [chooseUrl, setChooseUrl] = useState("");
  const [template, setTemplate] = useState<Template>("custom");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ good: boolean; text: string } | null>(null);

  const selectedOrder = selection === "manual" ? null : orders.find((o) => o.id === selection) ?? null;

  function pick(id: string) {
    setSelection(id);
    if (id === "manual") {
      setTo(""); setBusinessName(""); setPreviewUrl(""); setChooseUrl("");
      return;
    }
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    setTo(order.email ?? "");
    setBusinessName(order.businessName);
    setPreviewUrl(order.previewUrl ?? "");
    setChooseUrl(order.previewUrl ? `${window.location.origin}/choose/${order.id}` : "");
  }

  const active = TEMPLATES.find((t) => t.key === template)!;

  async function submit() {
    setBusy(true); setNote(null);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to, template, name, businessName,
          previewUrl, liveUrl: previewUrl, chooseUrl,
          subject, message,
          orderId: selectedOrder?.id ?? null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setNote({ good: true, text: `Sent to ${to}.` });
    } catch (err) {
      setNote({ good: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const canSend = to.includes("@") && !busy && (
    template !== "custom" ? true : Boolean(subject.trim() && message.trim())
  );

  return (
    <div className="panel">
      <label>
        Send to
        <select value={selection} onChange={(e) => pick(e.target.value)}>
          <option value="manual">Type an email address manually</option>
          {leads.length > 0 && (
            <optgroup label="Leads">
              {leads.map((o) => (
                <option key={o.id} value={o.id} disabled={!o.email}>
                  {o.label}{!o.email ? " (no email on file)" : ""}
                </option>
              ))}
            </optgroup>
          )}
          {done.length > 0 && (
            <optgroup label="Done (paid)">
              {done.map((o) => (
                <option key={o.id} value={o.id} disabled={!o.email}>
                  {o.label}{!o.email ? " (no email on file)" : ""}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <label style={{ marginTop: 12 }}>
        Email address
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="owner@theirbusiness.ie"
          disabled={selection !== "manual"}
        />
      </label>

      <label style={{ marginTop: 12 }}>
        Template
        <select value={template} onChange={(e) => setTemplate(e.target.value as Template)}>
          {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </label>

      <div className="detail-grid" style={{ marginTop: 12 }}>
        <label>Their name (optional)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Owner's first name" /></label>
        {template !== "custom" && (
          <label>Business name<input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Their business" /></label>
        )}
      </div>

      {active.needs.includes("previewUrl") && (
        <label style={{ marginTop: 12 }}>
          Preview / website URL
          <input value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://web99.ie/demo/their-slug" />
        </label>
      )}
      {active.needs.includes("liveUrl") && (
        <label style={{ marginTop: 12 }}>
          Live website URL
          <input value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://web99.ie/demo/their-slug" />
        </label>
      )}
      {active.needs.includes("chooseUrl") && (
        <label style={{ marginTop: 12 }}>
          "Stay or leave" link
          <input value={chooseUrl} onChange={(e) => setChooseUrl(e.target.value)} placeholder="https://web99.ie/choose/<order id>" />
        </label>
      )}

      {template === "custom" && (
        <>
          <label style={{ marginTop: 12 }}>Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
          <label style={{ marginTop: 12 }}>Message<textarea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        </>
      )}

      <button className="btn" style={{ marginTop: 16 }} disabled={!canSend} onClick={submit}>
        {busy ? "Sending…" : "Send email"}
      </button>
      {note && <p className={note.good ? "success-note" : "action-error"} style={{ marginTop: 10, display: "block" }}>{note.text}</p>}
    </div>
  );
}
