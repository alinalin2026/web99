"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Choice({
  id,
  renewal,
  freeChanges,
}: {
  id: string;
  renewal: string;
  freeChanges: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function pick(retention: "stayed" | "left") {
    setBusy(retention);
    await fetch(`/api/choose/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retention }),
    });
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Stay with us</h2>
        <p>We keep it online, keep it backed up, and keep it working.</p>
        <ul style={{ paddingLeft: 18, color: "var(--muted)", fontSize: 14 }}>
          <li>Hosting and your domain, already paid for the first year</li>
          <li>Your {freeChanges} free changes, whenever you want them</li>
          <li>After the first year, {renewal}</li>
          <li>Message us any time — a person answers</li>
        </ul>
        <button className="btn" disabled={busy !== null} onClick={() => pick("stayed")}>
          {busy === "stayed" ? "…" : "Stay with us"}
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Take it elsewhere</h2>
        <p>It's your site. If you'd rather host it yourself or use someone else, that's grand.</p>
        <ul style={{ paddingLeft: 18, color: "var(--muted)", fontSize: 14 }}>
          <li>We hand over the domain, in your name</li>
          <li>We send you every file</li>
          <li>We help you move it — no charge</li>
          <li>No notice period and nothing to cancel</li>
        </ul>
        <button
          className="btn btn--ghost"
          disabled={busy !== null}
          onClick={() => pick("left")}
        >
          {busy === "left" ? "…" : "I'll take it elsewhere"}
        </button>
      </div>
    </div>
  );
}
