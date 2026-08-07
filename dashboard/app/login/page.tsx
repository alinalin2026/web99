"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
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
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      setError("That's not it.");
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 380, margin: "80px auto" }}>
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Web99</h1>
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
