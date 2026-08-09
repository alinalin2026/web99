import { Resend } from "resend";

let client: Resend | undefined;
function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set.");
  if (!client) client = new Resend(key);
  return client;
}

const FROM = process.env.EMAIL_FROM ?? "Web99 <hello@web99.ie>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@web99.ie";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c] as string));
}

export async function sendCustomEmail(to: string, subject: string, body: string): Promise<string> {
  if (!to) throw new Error("This lead has no email address.");
  if (!subject.trim() || !body.trim()) throw new Error("Subject and message are required.");
  const safeBody = escapeHtml(body.trim()).replace(/\n/g, "<br>");
  const html = `<!doctype html><html><body style="margin:0;background:#f6f4fe;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#141033"><div style="max-width:540px;margin:auto;background:white;border-radius:16px;padding:28px"><div style="font-size:22px;font-weight:800;margin-bottom:20px">Web<span style="color:#5b3fe8">99</span><span style="color:#6b6790">.ie</span></div><div style="font-size:16px;line-height:1.65">${safeBody}</div></div></body></html>`;
  const { data, error } = await resend().emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: subject.trim(),
    html,
    text: body.trim(),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data?.id ?? "";
}
