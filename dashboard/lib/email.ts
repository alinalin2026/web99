import { Resend } from "resend";

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

/* --- sending -------------------------------------------------------------- */

export async function send(to: string, email: Email): Promise<string> {
  const { data, error } = await resend().emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data?.id ?? "";
}
