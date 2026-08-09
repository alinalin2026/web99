/* ===========================================================================
   PUSHING A CUSTOMER SITE
   ---------------------------------------------------------------------------
   Every customer site is a folder in one repo: sites/<slug>/. One commit per
   approved build, so a site is never in a half-written state and any bad build
   is one revert away.

   GitHub publishing is deliberately NON-BLOCKING. The dashboard stores the
   finished build in Postgres first/alongside the workflow, and if GitHub is
   temporarily unavailable we return a pending marker instead of throwing away
   a perfectly good website build. The internal preview route can still serve
   the finished site while publishing is repaired/retried.

   Uses the git data API (blobs → tree → commit → ref) rather than the contents
   API, so a multi-file site lands as ONE atomic commit instead of a stream of
   half-deployed states.
   =========================================================================== */

import { W99_START, W99_END } from "./prompts/generator";

const OWNER = (process.env.SITES_REPO_OWNER ?? "").trim();
const REPO = (process.env.SITES_REPO_NAME ?? "").trim();
const BRANCH = (process.env.SITES_REPO_BRANCH ?? "main").trim() || "main";
const TOKEN = (process.env.GITHUB_TOKEN ?? "").trim();

const API = "https://api.github.com";

export const PUBLISH_PENDING_PREFIX = "pending:github:";
export function isPublishPending(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(PUBLISH_PENDING_PREFIX));
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  if (!TOKEN) throw new Error("GITHUB_TOKEN is not set.");
  if (!OWNER || !REPO) throw new Error("SITES_REPO_OWNER / SITES_REPO_NAME are not set.");

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub ${init?.method ?? "GET"} ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function pushSiteStrict(
  slug: string,
  files: Record<string, string>,
  businessName: string
): Promise<string> {
  const ref = await gh<{ object: { sha: string } }>(
    `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`
  );
  const headSha = ref.object.sha;

  const head = await gh<{ tree: { sha: string } }>(
    `/repos/${OWNER}/${REPO}/git/commits/${headSha}`
  );

  /* Blobs first. base64 so any byte survives the round trip. */
  const blobs = await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const blob = await gh<{ sha: string }>(`/repos/${OWNER}/${REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: Buffer.from(content, "utf8").toString("base64"),
          encoding: "base64",
        }),
      });
      return { path: `sites/${slug}/${path}`, sha: blob.sha };
    })
  );

  const tree = await gh<{ sha: string }>(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: head.tree.sha,
      tree: blobs.map((b) => ({
        path: b.path,
        mode: "100644",
        type: "blob",
        sha: b.sha,
      })),
    }),
  });

  const commit = await gh<{ sha: string }>(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `Build site for ${businessName} (${slug})`,
      tree: tree.sha,
      parents: [headSha],
    }),
  });

  await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return commit.sha;
}

/**
 * Write a whole site as one commit. Returns the commit SHA on success.
 * On a GitHub/token/network problem it returns a pending marker instead of
 * throwing. That is intentional: publishing is an output step, not a reason to
 * discard a completed website build.
 */
export async function pushSite(
  slug: string,
  files: Record<string, string>,
  businessName: string
): Promise<string> {
  try {
    return await pushSiteStrict(slug, files, businessName);
  } catch (err) {
    const message = (err as Error).message.replace(/\s+/g, " ").slice(0, 350);
    console.error("Web99 GitHub publish pending:", message);
    return `${PUBLISH_PENDING_PREFIX}${Buffer.from(message, "utf8").toString("base64url")}`;
  }
}

/**
 * Strip the preview banner and buy buttons once they've paid.
 *
 * Deletes everything between the fence markers and nothing else. Matching on
 * markers rather than on `<div>`s matters: an earlier version counted closing
 * tags and would have swallowed the customer's own markup after the block.
 */
export function removePreviewFurniture(html: string): string {
  const fenced = new RegExp(
    `${escapeRe(W99_START)}[\\s\\S]*?${escapeRe(W99_END)}\\s*`,
    "g"
  );
  return html.replace(fenced, "");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
