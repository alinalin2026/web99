import { claimNextJob, completeJob, retryOrFailJob } from "./lib/jobs";
import { fixAndRedeploy, runNextStep, startMasterBuild } from "./lib/master-pipeline";
import { getOrder, listAssets, logEvent, sql } from "./lib/db";
import { generateAllProjectAssets, prepareStudio } from "./lib/studio";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 1200);
let stopping = false;

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runApprovedBuild(orderId: string, plan: string, steer: string) {
  if (plan) await sql`UPDATE orders SET plan_text = ${plan} WHERE id = ${orderId}`;
  if (steer) {
    await sql`
      UPDATE orders
      SET analysis = COALESCE(analysis, '{}'::jsonb) || ${sql.json({ operatorDirection: steer })}
      WHERE id = ${orderId}`;
  }

  const initial = await getOrder(orderId);
  if (!initial?.plan_text && !plan) throw new Error("There is no website direction to build from.");

  await sql`UPDATE orders SET approved_by = 'operator', approved_at = now(), failure_reason = NULL WHERE id = ${orderId}`;
  await logEvent(orderId, "direction_approved", { message: `${initial?.business_name ?? "Website"} direction approved` });

  // Reuse completed work. A retry at the end of a build should not rewrite copy
  // or regenerate paid images that are already ready.
  if (!initial?.studio_copy) await prepareStudio(orderId);

  const assets = await listAssets(orderId);
  if (assets.some((asset) => asset.status !== "ready")) {
    await generateAllProjectAssets(orderId);
  }

  const beforeBuild = await getOrder(orderId);
  if (!beforeBuild?.generated || beforeBuild.state === "failed" || !beforeBuild.preview_url) {
    await startMasterBuild(orderId, "operator", steer || undefined);
  }
}

async function processOne(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  console.log(`[worker] job ${job.id} ${job.action} order=${job.order_id}`);
  try {
    switch (job.action) {
      case "run_next": {
        let step = await runNextStep(job.order_id);
        const order = await getOrder(job.order_id);
        // Full auto means exactly that: after the plan is made, continue through
        // copy, images, build and QA without asking for another browser tap.
        if (order?.autopilot === "full" && step === "plan") {
          step = await runNextStep(job.order_id);
        }
        await completeJob(job, { step });
        console.log(`[worker] job ${job.id} completed step=${step}`);
        return true;
      }
      case "approve_build": {
        const plan = String(job.payload?.plan ?? "").trim();
        const steer = String(job.payload?.steer ?? "").trim();
        await runApprovedBuild(job.order_id, plan, steer);
        await completeJob(job, { step: "ready_for_review" });
        console.log(`[worker] job ${job.id} completed full approved build`);
        return true;
      }
      case "fix_build": {
        const instruction = String(job.payload?.instruction ?? "").trim();
        if (!instruction) throw new Error("Missing fix instruction.");
        await fixAndRedeploy(job.order_id, instruction, "operator");
        await completeJob(job, { step: "ready_for_review" });
        console.log(`[worker] job ${job.id} completed requested fix`);
        return true;
      }
      default:
        throw new Error(`Unknown background job action: ${job.action}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[worker] job ${job.id} failed`, err);
    const outcome = await retryOrFailJob(job, err, 3);
    if (outcome === "retry") await sleep(2000);
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
