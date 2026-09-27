"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuizStatus } from "@/lib/quizCustomers";

async function post(id: number, action: string) {
  const res = await fetch(`/api/quiz-submissions/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export function QuizSubmissionActions({ id, status }: { id: number; status: QuizStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setError("");
    try {
      await post(id, action);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="button-row">
      {status !== "reviewed" && status !== "archived" && (
        <button className="tiny-btn" disabled={!!busy} onClick={() => run("review")}>
          {busy === "review" ? "Marking…" : "Mark reviewed"}
        </button>
      )}
      {status === "reviewed" && (
        <button className="tiny-btn" disabled={!!busy} onClick={() => run("unreview")}>
          {busy === "unreview" ? "Undoing…" : "Unreview"}
        </button>
      )}
      {status === "archived" ? (
        <button className="tiny-btn" disabled={!!busy} onClick={() => run("unarchive")}>
          {busy === "unarchive" ? "Restoring…" : "Unarchive"}
        </button>
      ) : (
        <button className="tiny-btn" disabled={!!busy} onClick={() => run("archive")}>
          {busy === "archive" ? "Archiving…" : "Archive"}
        </button>
      )}
      <button
        className="tiny-btn danger"
        disabled={!!busy}
        onClick={() => run("delete", "Delete this submission? This cannot be undone.")}
      >
        {busy === "delete" ? "Deleting…" : "Delete"}
      </button>
      {error && <small className="action-error">{error}</small>}
    </div>
  );
}
