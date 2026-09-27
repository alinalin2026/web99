import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { insertAttachment, insertEmailAttachment, type ChatAttachment, type EmailAttachmentRow } from "./db";

/* Customer uploads from the Sarah chat (/start). Stored on disk outside the
   git checkout (see UPLOAD_DIR) so a redeploy never touches them, with a DB
   row as the auth-gated pointer used by the download route. */

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_FILES_PER_MESSAGE = 5;

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

function uploadRoot(): string {
  const dir = process.env.UPLOAD_DIR?.trim();
  if (!dir) throw new Error("UPLOAD_DIR is not set.");
  return dir;
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ]+/g, "_").trim();
  return (base || "file").slice(0, 150);
}

export class AttachmentError extends Error {}

export async function saveUploadedFile(orderId: string, file: File): Promise<ChatAttachment> {
  if (file.size <= 0) throw new AttachmentError(`"${file.name}" is empty.`);
  if (file.size > MAX_FILE_BYTES) {
    throw new AttachmentError(`"${file.name}" is over the 100MB limit.`);
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new AttachmentError(`"${file.name}" is not a supported file type.`);
  }

  const filename = sanitizeFilename(file.name || "file");
  const dir = path.join(uploadRoot(), orderId);
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, `${randomUUID()}-${filename}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  return insertAttachment({
    orderId, filename, mimeType, sizeBytes: file.size, storagePath,
  });
}

/* Attachments on stored emails (currently: inbound only — Resend's receiving
   API is the source, see listReceivedEmailAttachments in lib/email.ts). Same
   disk-plus-pointer approach as saveUploadedFile above, under its own
   UPLOAD_DIR subdirectory so the two never collide. */
export async function saveEmailAttachment(
  emailId: number,
  rawFilename: string,
  mimeType: string,
  buffer: Buffer
): Promise<EmailAttachmentRow> {
  const filename = sanitizeFilename(rawFilename || "attachment");
  const dir = path.join(uploadRoot(), "emails", String(emailId));
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, `${randomUUID()}-${filename}`);
  await writeFile(storagePath, buffer);

  return insertEmailAttachment({
    emailId, filename, mimeType: mimeType || "application/octet-stream",
    sizeBytes: buffer.byteLength, storagePath,
  });
}
