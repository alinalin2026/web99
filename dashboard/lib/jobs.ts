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
      message: "Work queued",
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

/**
 * There is deliberately one Web99 worker for the first production phase.
 * Therefore a job still marked running when that worker starts can only belong
 * to a worker process that was interrupted by a deploy/reboot/crash. Requeue it
 * immediately instead of leaving the customer project stuck forever.
 */
export async function recoverInterruptedJobs(): Promise<number> {
  await ensureMasterSchema();
  const rows = await sql<{ id: number; order_id: string; action: string }[]>`
    UPDATE jobs
    SET status = 'queued',
        started_at = NULL,
        finished_at = NULL,
        error = CASE
          WHEN error IS NULL OR error = '' THEN 'Recovered after worker restart'
          ELSE error || E'\nRecovered after worker restart'
        END
    WHERE status = 'running'
    RETURNING id, order_id, action`;

  for (const row of rows) {
    await logEvent(row.order_id, "job_recovered", {
      message: "Web99 recovered interrupted work automatically",
      action: row.action,
      jobId: row.id,
    });
  }
  return rows.length;
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
    message: "Work finished",
    action: job.action,
    jobId: job.id,
    ...result,
  });
}

export async function retryOrFailJob(job: BackgroundJob, error: Error, maxAttempts = 3): Promise<"retry" | "failed"> {
  const message = error.message.slice(0, 4000);

  if (job.attempts < maxAttempts) {
    await sql`
      UPDATE jobs
      SET status = 'queued', error = ${message}, started_at = NULL, finished_at = NULL
      WHERE id = ${job.id}`;
    await logEvent(job.order_id, "job_retry", {
      message: `Something went wrong; Web99 is retrying automatically (${job.attempts}/${maxAttempts})`,
      action: job.action,
      jobId: job.id,
      attempt: job.attempts,
    });
    return "retry";
  }

  await sql`
    UPDATE jobs
    SET status = 'failed', error = ${message}, finished_at = now()
    WHERE id = ${job.id}`;
  await sql`
    UPDATE orders
    SET failure_reason = ${message}, workflow_stage = 'job_failed'
    WHERE id = ${job.order_id}`;
  await logEvent(job.order_id, "job_failed", {
    message: "Web99 needs you — automatic retries did not fix this step",
    action: job.action,
    jobId: job.id,
    error: message,
  });
  return "failed";
}
