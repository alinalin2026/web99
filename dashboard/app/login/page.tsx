"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    setBusy(false);
    if (res.ok) {
      const next = params.get("next") || "/";
      // Be explicit here instead of relying on router/basePath interaction.
      window.location.href = next === "/" ? "/control" : `/control${next}`;
      return;
    }

    if (res.status === 503) {
      setError("The operator key is not configured on this AWS deployment. Set ADMIN_PASSWORD in .env.local and restart the dashboard.");
    } else {
      setError("That's not it.");
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 380, margin: "80px auto" }}>
      <h1 style={{ fontSize: 20, marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/control/brand/icon-192.png" alt="" width={26} height={26} />
        Web99
      </h1>
      <label htmlFor="secret">Operator key</label>
      <input
        id="secret"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
      />
      {error && <p style={{ color: "var(--red)", fontSize: 14 }}>{error}</p>}
      <button className="btn" style={{ marginTop: 14 }} disabled={busy || !secret}>
        {busy ? "…" : "In"}
      </button>
    </form>
  );
}

export default function Login() {
  return (
    <main className="wrap">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
