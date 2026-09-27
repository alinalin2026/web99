import { Resend } from "resend";
import { insertEmail } from "./db";

/* ===========================================================================
   EMAIL
   ---------------------------------------------------------------------------
   Four emails, in the order a customer meets them:

     1. onTheWay   — instant, the moment they finish with Sarah
     2. siteReady  — the one that matters. Their site, live, with a buy button
     3. nudge      — one gentle follow-up if they go quiet
     4. paid       — receipt, what happens next, stay-or-leave

   Deliberately plain HTML. A small business owner reading this on a phone in a
   van should see a sentence and a button, not a newsletter. Inline styles only
   — email clients strip <style> blocks unpredictably.

   Deliverability note: sending "your website is live" from a young domain
   lands in spam. SPF, DKIM and DMARC must be set on the sending domain before
   any of this goes out at volume.
   =========================================================================== */

let _resend: Resend | undefined;
function resend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set. See .env.example.");
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "Web99 <hello@web99.ie>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@web99.ie";

const VIOLET = "#5b3fe8";
const INK = "#141033";
const MUTED = "#6b6790";

interface Email {
  subject: string;
  html: string;
  text: string;
}

/* --- shell ---------------------------------------------------------------- */

function shell(body: string): string {
  return `<!doctype html>
<html lang="en-IE"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#f6f4fe;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fe;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td>
<p style="margin:0 0 24px;font-size:21px;font-weight:800;color:${INK};letter-spacing:-.4px;">Web<span style="color:${VIOLET};">99</span><span style="color:${MUTED};font-weight:600;">.ie</span></p>
${body}
</td></tr></table>
<p style="max-width:520px;margin:18px auto 0;font-size:12px;line-height:1.6;color:${MUTED};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-align:center;">
Web99.ie · 38 Fitzwilliam Square W, Dublin 2, D02 T938 · (01) 234 3300<br>
Just reply to this email if you'd rather talk to a person.
</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0;"><tr>
<td style="background:${VIOLET};border-radius:999px;">
<a href="${href}" style="display:inline-block;padding:15px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${label}</a>
</td></tr></table>`;
}

const p = (t: string) =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${INK};">${t}</p>`;
const small = (t: string) =>
  `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${MUTED};">${t}</p>`;

/* --- 1. straight after Sarah ---------------------------------------------- */

export function onTheWay(name: string, businessName: string): Email {
  const first = name || "there";
  return {
    subject: `Your website is being built, ${businessName}`,
    html: shell(
      p(`Hi ${first},`) +
        p(`Thanks — we've got everything we need. Your website is being built now, and it'll be ready <strong>tomorrow</strong>.`) +
        p(`When it's done we'll email you a link. You'll see the whole thing, live, before you decide anything. Nothing has been charged and there's no card on file.`) +
        small(`One thing that would help: if you've a logo, or a few photos of the place, just reply to this email with them attached. We'll use them. If you haven't, don't worry — we'll build it without.`)
    ),
    text: `Hi ${first},

Thanks — we've got everything we need. Your website is being built now and it'll be ready tomorrow.

When it's done we'll email you a link. You'll see the whole thing, live, before you decide anything. Nothing has been charged and there's no card on file.

If you've a logo or a few photos of the place, reply to this email with them attached and we'll use them. If not, no bother.

Web99.ie · (01) 234 3300`,
  };
}

/* --- 2. the one that matters ---------------------------------------------- */

export function siteReady(
  name: string,
  businessName: string,
  previewUrl: string
): Email {
  const first = name || "there";
  return {
    subject: `${businessName} — your website is ready to look at`,
    html: shell(
      p(`Hi ${first},`) +
        p(`Your website is built and live. Here it is:`) +
        button(previewUrl, "See your website") +
        p(`Have a proper look. Show it to whoever you like. Sleep on it.`) +
        p(`If you want it, there's a button on the page to take it — <strong>€99 once</strong>, and that covers the domain and hosting for the first year. If you don't, close this email and that's genuinely the end of it. You've not been charged and there's nothing to cancel.`) +
        small(`Something not right? Reply and tell us what to change — that's free and there's no limit before you buy.`) +
        small(`<a href="${previewUrl}" style="color:${VIOLET};">${previewUrl}</a>`)
    ),
    text: `Hi ${first},

Your website is built and live. Here it is:

${previewUrl}

Have a proper look. Show it to whoever you like. Sleep on it.

If you want it, there's a button on the page to take it — €99 once, and that covers the domain and hosting for the first year. If you don't, close this email and that's the end of it. You've not been charged and there's nothing to cancel.

Something not right? Reply and tell us what to change. That's free.

Web99.ie · (01) 234 3300`,
  };
}

/* --- 2b. the instant-quiz preview, sent on request ------------------------- */

export function previewReady(businessName: string, previewUrl: string): Email {
  return {
    subject: `${businessName} — here's the preview you just built`,
    html: shell(
      p(`Here's the website you just put together for ${businessName}:`) +
        button(previewUrl, "See your website") +
        p(`Have a proper look, show it around, sleep on it. If you want it, there's a button on the page to take it — <strong>€99 once</strong>, covering the domain and hosting for the first year.`) +
        small(`<a href="${previewUrl}" style="color:${VIOLET};">${previewUrl}</a>`)
    ),
    text: `Here's the website you just put together for ${businessName}:

${previewUrl}

Have a proper look, show it around, sleep on it. If you want it, there's a button on the page to take it — €99 once, covering the domain and hosting for the first year.

Web99.ie · (01) 234 3300`,
  };
}

/* --- 3. one nudge, then we leave them alone -------------------------------- */

export function nudge(name: string, businessName: string, previewUrl: string): Email {
  const first = name || "there";
  return {
    subject: `Did you get a look at ${businessName}'s site?`,
    html: shell(
      p(`Hi ${first},`) +
        p(`Just checking you saw this — your website is still sitting here:`) +
        button(previewUrl, "See your website") +
        p(`No rush and no pressure. If it's not for you, just say and we'll take it down. If something about it put you off, I'd genuinely like to know what.`) +
        small(`This is the only reminder we'll send.`)
    ),
    text: `Hi ${first},

Just checking you saw this — your website is still sitting here:

${previewUrl}

No rush and no pressure. If it's not for you, just say and we'll take it down. If something about it put you off, I'd genuinely like to know what.

This is the only reminder we'll send.

Web99.ie · (01) 234 3300`,
  };
}

/* --- 4. after they pay ----------------------------------------------------- */

export function paid(
  name: string,
  businessName: string,
  liveUrl: string,
  chooseUrl: string
): Email {
  const first = name || "there";
  return {
    subject: `That's ${businessName} online — here's what happens now`,
    html: shell(
      p(`Hi ${first},`) +
        p(`Payment received, thank you. ${businessName} is online.`) +
        button(liveUrl, "Your website") +
        p(`Your domain is being registered in <strong>your</strong> name now — not ours — and we'll email you when it's pointing at the site. Your business email is being set up at the same time.`) +
        p(`You've <strong>three free changes</strong> whenever you want them. Hours, phone number, photos, wording — just reply and tell us.`) +
        p(`One thing to decide, whenever you're ready:`) +
        button(chooseUrl, "Stay with us, or take it elsewhere") +
        small(`There's no wrong answer and no catch either way. If you'd rather host it yourself or move to someone else, we'll help you move it and we won't charge you for that. It's your site.`)
    ),
    text: `Hi ${first},

Payment received, thank you. ${businessName} is online.

${liveUrl}

Your domain is being registered in your name now — not ours — and we'll email you when it's pointing at the site. Your business email is being set up at the same time.

You've three free changes whenever you want them. Hours, phone number, photos, wording — just reply and tell us.

One thing to decide whenever you're ready — stay with us, or take it elsewhere:
${chooseUrl}

There's no wrong answer and no catch either way. If you'd rather host it yourself or move to someone else, we'll help you move it and we won't charge for that. It's your site.

Web99.ie · (01) 234 3300`,
  };
}

/* --- 5. quick personal check-in, no branding, signed as a person ---------- */

export function alanCheckIn(): Email {
  const body = `Hey, it's Alan from Web99.ie — just wanted to check in and see if you've had a chance to look at the designs we sent over. No rush at all, just let us know if anything jumps out at you or if you'd like anything changed.`;
  return {
    subject: "Quick one from Alan",
    html: `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f6f4fe;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:28px 24px;">
<tr><td>
<p style="margin:0;font-size:16px;line-height:1.65;color:${INK};">${body}</p>
<p style="margin:20px 0 0;font-size:16px;line-height:1.5;color:${INK};">— Alan</p>
</td></tr></table>
</td></tr></table></body></html>`,
    text: `${body}\n\n— Alan`,
  };
}

/* --- sending -------------------------------------------------------------- */

/** Sends one of the branded template emails and permanently records it —
    Resend's own dashboard only retains sent mail for 30 days, so this table
    is the real record, not a cache of it. orderId is stored when known
    (most calls have one); pass null for ad-hoc sends with no order. */
export async function send(to: string, email: Email, orderId: string | null = null): Promise<string> {
  const messageId = `<${crypto.randomUUID()}@web99.ie>`;
  const { data, error } = await resend().emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: { "Message-ID": messageId },
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  try {
    await insertEmail({
      order_id: orderId,
      direction: "outbound",
      from_email: FROM,
      to_email: to,
      subject: email.subject,
      html: email.html,
      text_body: email.text,
      message_id: messageId,
      in_reply_to: null,
      refs: null,
      thread_id: crypto.randomUUID(),
      resend_id: data?.id ?? null,
    });
  } catch (err) {
    // The send already succeeded — don't make the caller think it failed
    // (and risk a duplicate resend) over a persistence error. Loud log only.
    console.error("send(): email delivered but insertEmail failed", err);
  }
  return data?.id ?? "";
}

/* ===========================================================================
   INBOX
   ---------------------------------------------------------------------------
   Resend's email.received webhook carries metadata only (from/to/subject/
   message_id) — not the body or the In-Reply-To / References headers needed
   for threading. Those come from a second call to the receiving API.
   Confirmed against Resend's current docs 2026-08-15: GET
   https://api.resend.com/emails/receiving/{id}, Bearer-authed, response has
   a flat "headers" object keyed by lowercase header name.
   =========================================================================== */

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  html: string | null;
  text: string | null;
  message_id: string;
  headers: Record<string, string>;
}

export async function getReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set.");
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Resend receiving API: ${res.status} ${await res.text()}`);
  return res.json();
}

/* Webhooks carry metadata only — attachment content never comes through
   them. This lists each attachment's metadata plus a CDN download_url
   (pre-generated, no follow-up call needed per attachment, valid ~1h) —
   confirmed against Resend's current docs 2026-09-22:
   GET /emails/receiving/{id}/attachments. */
export interface ReceivedAttachment {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  download_url: string;
}

export async function listReceivedEmailAttachments(emailId: string): Promise<ReceivedAttachment[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set.");
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Resend receiving attachments API: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data ?? [];
}

function escapeHtmlInbox(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c] as string));
}

/** Sends a reply threaded under an existing email via In-Reply-To/References,
    with our own Message-ID so a later reply-to-this-reply can thread too
    (Resend's send response only returns its own internal id, not an RFC
    Message-ID). Returns both ids for storage. */
export async function sendThreaded(args: {
  to: string;
  subject: string;
  bodyText: string;
  inReplyTo: string;
  references: string | null;
}): Promise<{ resendId: string; messageId: string }> {
  const messageId = `<${crypto.randomUUID()}@web99.ie>`;
  const references = [args.references, args.inReplyTo].filter(Boolean).join(" ");
  const safeBody = escapeHtmlInbox(args.bodyText.trim()).replace(/\n/g, "<br>");
  const html = `<!doctype html><html><body style="margin:0;background:#f6f4fe;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#141033"><div style="max-width:540px;margin:auto;background:white;border-radius:16px;padding:28px"><div style="font-size:22px;font-weight:800;margin-bottom:20px">Web<span style="color:#5b3fe8">99</span><span style="color:#6b6790">.ie</span></div><div style="font-size:16px;line-height:1.65">${safeBody}</div></div></body></html>`;

  const { data, error } = await resend().emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: args.to,
    subject: args.subject,
    html,
    text: args.bodyText.trim(),
    headers: {
      "Message-ID": messageId,
      "In-Reply-To": args.inReplyTo,
      References: references,
    },
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return { resendId: data?.id ?? "", messageId };
}
