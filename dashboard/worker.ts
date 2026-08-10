import { claimNextJob, completeJob, failJob } from "./lib/jobs";
import { runNextStep } from "./lib/master-pipeline";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 1200);
let stopping = false;

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  console.log(`[worker] job ${job.id} ${job.action} order=${job.order_id}`);
  try {
    switch (job.action) {
      case "run_next": {
        const step = await runNextStep(job.order_id);
        await completeJob(job, { step });
        console.log(`[worker] job ${job.id} completed step=${step}`);
        return true;
      }
      default:
        throw new Error(`Unknown background job action: ${job.action}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[worker] job ${job.id} failed`, err);
    await failJob(job, err);
    return true;
  }
}

async function main() {
  console.log(`[worker] Web99 worker started; polling every ${POLL_MS}ms`);
  while (!stopping) {
    try {
      const worked = await processOne();
      if (!worked) await sleep(POLL_MS);
    } catch (error) {
      console.error("[worker] poll error", error);
      await sleep(Math.max(POLL_MS, 2500));
    }
  }
  console.log("[worker] stopped");
}

main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
