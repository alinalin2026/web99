import { NextRequest, NextResponse } from "next/server";

/* ===========================================================================
   OPERATOR ACCESS
   ---------------------------------------------------------------------------
   The dashboard holds every customer's name, phone, email and business
   details, and it can push to a repo and send email in Web99's name. It must
   never be reachable without a credential.

   Built on Web Crypto rather than node:crypto because middleware runs on the
   Edge runtime, where node: imports don't exist. Web Crypto works in both, so
   there is one implementation instead of two that can drift.

   This is a shared-secret gate, which is honest about what it is: right for a
   studio where the operators are one or two people who trust each other, and
   NOT right the day somebody needs to be removed without rotating everyone's
   access. Every call site goes through requireOperator(), so replacing this
   with real per-person accounts is a one-file change.
   =========================================================================== */

const COOKIE = "w99_op";
const enc = new TextEncoder();

async function hmacHex(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent compare. Both sides are hashed first, so neither the
    value nor its length leaks through timing. */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([hmacHex("cmp", a), hmacHex("cmp", b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

/* Trimmed on the way in. A stray trailing space or newline from copy-pasting
   a secret into Vercel's env var UI (or into the login box) is by far the
   most common reason this stops matching, and it isn't a security-relevant
   difference worth failing login over. */
function configuredSecret(): string {
  return (process.env.ADMIN_PASSWORD ?? "").trim();
}

/** What goes in the cookie: an HMAC of the secret, never the secret itself. */
export async function sessionToken(): Promise<string> {
  return hmacHex(configuredSecret(), "web99-operator-v1");
}

export async function checkSecret(candidate: string): Promise<boolean> {
  const secret = configuredSecret();
  if (!secret) return false;
  return constantTimeEqual(candidate.trim(), secret);
}

export async function isOperator(req: NextRequest): Promise<boolean> {
  if (!configuredSecret()) return false;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && (await checkSecret(auth.slice(7)))) {
    return true;
  }

  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie && (await constantTimeEqual(cookie, await sessionToken()))) {
    return true;
  }

  return false;
}

/** Returns a response when the caller isn't an operator, or null when they are. */
export async function requireOperator(req: NextRequest): Promise<NextResponse | null> {
  if (!configuredSecret()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set — the dashboard is locked until it is." },
      { status: 503 }
    );
  }
  if (!(await isOperator(req))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  return null;
}

export { COOKIE as OPERATOR_COOKIE };
