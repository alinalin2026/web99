import { ensureMasterSchema, jsonb, logEvent, sql } from "@/lib/db";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface BackgroundJob {
  id: number;
  order_id: string;
  action: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  error: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export async function enqueueJob(
  orderId: string,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<{ id: number; alreadyQueued: boolean }> {
  await ensureMasterSchema();

  const rows = await sql<{ id: number }[]>`
    INSERT INTO jobs (order_id, action, payload)
    VALUES (${orderId}, ${action}, ${jsonb(payload)})
    ON CONFLICT (order_id, action) WHERE status IN ('queued','running') DO NOTHING
    RETURNING id`;

  if (rows[0]) {
    await logEvent(orderId, "job_queued", {
      message: "Web99 Agent job queued",
      action,
      jobId: rows[0].id,
    });
    return { id: rows[0].id, alreadyQueued: false };
  }

  const [existing] = await sql<{ id: number }[]>`
    SELECT id FROM jobs
    WHERE order_id = ${orderId}
      AND action = ${action}
      AND status IN ('queued','running')
    ORDER BY created_at DESC
    LIMIT 1`;

  return { id: existing?.id ?? 0, alreadyQueued: true };
}

export async function claimNextJob(): Promise<BackgroundJob | null> {
  await ensureMasterSchema();
  const rows = await sql<BackgroundJob[]>`
    WITH picked AS (
      SELECT id
      FROM jobs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE jobs
    SET status = 'running', started_at = now(), attempts = attempts + 1, error = NULL
    FROM picked
    WHERE jobs.id = picked.id
    RETURNING jobs.*`;
  return rows[0] ?? null;
}

export async function completeJob(
  job: BackgroundJob,
  result: Record<string, unknown> = {}
): Promise<void> {
  await sql`
    UPDATE jobs
    SET status = 'completed', result = ${jsonb(result)}, finished_at = now()
    WHERE id = ${job.id}`;
  await logEvent(job.order_id, "job_completed", {
    message: "Web99 Agent finished background job",
    action: job.action,
    jobId: job.id,
    ...result,
  });
}

export async function failJob(job: BackgroundJob, error: Error): Promise<void> {
  const message = error.message.slice(0, 4000);
  await sql`
    UPDATE jobs
    SET status = 'failed', error = ${message}, finished_at = now()
    WHERE id = ${job.id}`;
  await sql`
    UPDATE orders
    SET failure_reason = ${message}, workflow_stage = 'job_failed'
    WHERE id = ${job.order_id}`;
  await logEvent(job.order_id, "job_failed", {
    message: "Web99 Agent background job failed",
    action: job.action,
    jobId: job.id,
    error: message,
  });
}
