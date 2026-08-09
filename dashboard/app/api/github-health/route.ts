import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const token = process.env.GITHUB_TOKEN?.trim() ?? "";
  const owner = process.env.SITES_REPO_OWNER?.trim() ?? "";
  const repo = process.env.SITES_REPO_NAME?.trim() ?? "";
  const branch = process.env.SITES_REPO_BRANCH?.trim() || "main";

  async function probe(path: string) {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    return res.status;
  }

  const [userStatus, repoStatus, refStatus] = await Promise.all([
    token ? probe("/user") : Promise.resolve(0),
    owner && repo ? probe(`/repos/${owner}/${repo}`) : Promise.resolve(0),
    owner && repo ? probe(`/repos/${owner}/${repo}/git/ref/heads/${branch}`) : Promise.resolve(0),
  ]);

  return NextResponse.json({
    configured: Boolean(token && owner && repo),
    owner,
    repo,
    branch,
    tokenPresent: Boolean(token),
    tokenPrefix: token ? token.slice(0, 4) : null,
    userStatus,
    repoStatus,
    refStatus,
  });
}
