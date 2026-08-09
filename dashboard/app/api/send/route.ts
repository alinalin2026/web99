import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth";
import { custom, send } from "@/lib/email";

export const runtime = "nodejs";

/* One box, the Web99 template applied around it, sent through Resend from
   the business address (EMAIL_FROM). Not tied to an order — for the ad-hoc
   "just need to email this person" case the pipeline doesn't cover. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  const denied = await requireOperator(req);
  if (denied) return denied;

  const { to, subject, message, ctaLabel, ctaUrl, preview } = (await req.json()) as {
    to?: string;
    subject?: string;
    message?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    preview?: boolean;
  };

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }

  const cta =
    ctaLabel?.trim() && ctaUrl?.trim() ? { label: ctaLabel.trim(), url: ctaUrl.trim() } : undefined;
  const email = custom(subject.trim(), message, cta);

  if (preview) {
    return NextResponse.json({ ok: true, html: email.html });
  }

  const recipients = parseRecipients(to ?? "");
  if (recipients.length === 0) {
    return NextResponse.json({ error: "At least one recipient email is required." }, { status: 400 });
  }
  const invalid = recipients.filter((r) => !EMAIL_RE.test(r));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Not a valid email address: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const id = await send(recipients, email);
    return NextResponse.json({ ok: true, id, sentTo: recipients });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
