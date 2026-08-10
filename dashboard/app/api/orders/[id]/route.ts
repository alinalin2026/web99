import { NextRequest, NextResponse } from "next/server";
import {
  getOrder, getAsset, jsonb, logEvent, scheduleLeadFollowups, setState, setWorkflow, sql,
} from "@/lib/db";
import {
  approvePlanAndContinue, finaliseMasterBuild, fixAndRedeploy, makeMasterPlan,
  startMasterBuild,
} from "@/lib/master-pipeline";
import { enqueueJob } from "@/lib/jobs";
import { generateProjectAsset } from "@/lib/images";
import { generateAllProjectAssets, prepareStudio } from "@/lib/studio";
import { siteReady, send } from "@/lib/email";
import { sendCustomEmail } from "@/lib/custom-email";
import { requireOperator } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "No such lead/project" }, { status: 404 });

  const body = (await req.json()) as Record<string, any>;
  const action = String(body.action ?? "");

  try {
    switch (action) {
      case "queue": {
        if (order.state === "lost" || order.state === "won") throw new Error("This project is closed.");
        if (order.state === "collecting" || order.state === "failed") {
          await sql`UPDATE orders SET state = 'ready' WHERE id = ${id}`;
        }
        await setWorkflow(id, "queued", { message: `${order.business_name ?? "Lead"} added to the planning queue` });
        await makeMasterPlan(id, body.steer);
        const fresh = await getOrder(id);
        if (fresh?.autopilot === "full") await approvePlanAndContinue(id, body.who ?? "operator");
        return NextResponse.json({ ok: true, stage: "plan_ready" });
      }

      case "makePlan": {
        await makeMasterPlan(id, body.steer);
        return NextResponse.json({ ok: true, stage: "plan_ready" });
      }

      case "savePlan": {
        const plan = String(body.plan ?? "").trim();
        if (!plan) throw new Error("The plan cannot be empty.");
        await sql`UPDATE orders SET plan_text = ${plan}, workflow_stage = 'plan_ready' WHERE id = ${id}`;
        await logEvent(id, "plan_edited", { message: `${order.business_name ?? "Website"} plan edited by operator` });
        return NextResponse.json({ ok: true });
      }

      case "approvePlan": {
        if (typeof body.plan === "string" && body.plan.trim()) {
          await sql`UPDATE orders SET plan_text = ${body.plan.trim()} WHERE id = ${id}`;
        }
        await approvePlanAndContinue(id, body.who ?? "operator");
        return NextResponse.json({ ok: true });
      }

      case "prepareStudio": {
        await prepareStudio(id);
        return NextResponse.json({ ok: true, stage: "studio_ready" });
      }

      case "saveCopy": {
        const copy = String(body.copy ?? "").trim();
        if (!copy) throw new Error("Website copy cannot be empty.");
        await sql`UPDATE orders SET studio_copy = ${copy} WHERE id = ${id}`;
        await logEvent(id, "copy_edited", { message: `${order.business_name ?? "Website"} copy edited` });
        return NextResponse.json({ ok: true });
      }

      case "saveAssetPrompt": {
        const assetId = String(body.assetId ?? "");
        const asset = await getAsset(assetId, id);
        if (!asset) throw new Error("No such image prompt.");
        const prompt = String(body.prompt ?? "").trim();
        if (!prompt) throw new Error("Image prompt cannot be empty.");
        await sql`
          UPDATE project_assets SET prompt = ${prompt}, status = 'prompt_ready', data_url = NULL, error = NULL
          WHERE id = ${assetId} AND order_id = ${id}`;
        await logEvent(id, "image_prompt_edited", { assetId, title: asset.title });
        return NextResponse.json({ ok: true });
      }

      case "generateAsset": {
        const assetId = String(body.assetId ?? "");
        if (typeof body.prompt === "string" && body.prompt.trim()) {
          await sql`
            UPDATE project_assets SET prompt = ${body.prompt.trim()}, status = 'prompt_ready', data_url = NULL, error = NULL
            WHERE id = ${assetId} AND order_id = ${id}`;
        }
        await generateProjectAsset(id, assetId);
        return NextResponse.json({ ok: true });
      }

      case "generateAll": {
        await generateAllProjectAssets(id);
        return NextResponse.json({ ok: true });
      }

      case "startBuild": {
        await startMasterBuild(id, body.who ?? "operator", body.steer);
        return NextResponse.json({ ok: true });
      }

      case "fix": {
        await fixAndRedeploy(id, String(body.instruction ?? ""), body.who ?? "operator");
        return NextResponse.json({ ok: true });
      }

      case "runNext": {
        const job = await enqueueJob(id, "run_next");
        return NextResponse.json({
          ok: true,
          queued: true,
          jobId: job.id,
          alreadyQueued: job.alreadyQueued,
        }, { status: 202 });
      }

      case "setAutopilot": {
        const mode = String(body.mode ?? "");
        if (!new Set(["manual", "assisted", "full"]).has(mode)) throw new Error("Invalid autopilot mode.");
        await sql`UPDATE orders SET autopilot = ${mode} WHERE id = ${id}`;
        await logEvent(id, "autopilot", { message: `Autopilot set to ${mode}`, mode });
        return NextResponse.json({ ok: true, mode });
      }

      case "setFollowups": {
        const enabled = Boolean(body.enabled);
        await sql`UPDATE orders SET followup_enabled = ${enabled} WHERE id = ${id}`;
        if (enabled) await scheduleLeadFollowups(id);
        else await sql`UPDATE followups SET status = 'cancelled' WHERE order_id = ${id} AND status = 'pending'`;
        return NextResponse.json({ ok: true, enabled });
      }

      case "sendCustom": {
        if (!order.email) throw new Error("This lead has no email address.");
        const subject = String(body.subject ?? "");
        const message = String(body.message ?? "");
        const messageId = await sendCustomEmail(order.email, subject, message);
        await logEvent(id, "email", { message: `Email sent to ${order.email}`, template: "custom", subject, messageId });
        return NextResponse.json({ ok: true });
      }

      case "sendPreview": {
        const fresh = await getOrder(id);
        if (!fresh?.email || !fresh.preview_url) throw new Error("This project needs an email and deployed preview first.");
        await send(fresh.email, siteReady("", fresh.business_name ?? "your business", fresh.preview_url));
        await sql`UPDATE orders SET sent_at = now(), customer_status = 'waiting_customer', state = 'sent' WHERE id = ${id}`;
        await logEvent(id, "preview_sent", { message: `${fresh.business_name ?? "Website"} sent to customer`, to: fresh.email, previewUrl: fresh.preview_url });
        return NextResponse.json({ ok: true, state: "sent" });
      }

      case "restoreVersion": {
        const version = Number(body.version);
        const [snapshot] = await sql<{ generated: Record<string, string> }[]>`
          SELECT generated FROM project_versions WHERE order_id = ${id} AND version_no = ${version}`;
        if (!snapshot?.generated) throw new Error("That version no longer exists.");
        await finaliseMasterBuild(id, snapshot.generated, "restore", `Restored version ${version}`);
        return NextResponse.json({ ok: true });
      }

      case "reject": {
        await setState(id, "lost", { by: body.who ?? "operator", reason: body.reason ?? "" });
        await setWorkflow(id, "complete", { message: `${order.business_name ?? "Lead"} closed` });
        return NextResponse.json({ ok: true });
      }

      case "delete": {
        await sql`DELETE FROM orders WHERE id = ${id}`;
        return NextResponse.json({ ok: true, deleted: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}