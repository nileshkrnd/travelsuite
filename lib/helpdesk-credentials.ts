import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type HelpdeskMailboxCredentials = {
  /** Gmail App Password */
  appPassword?: string;
  ms365TenantId?: string;
  ms365ClientId?: string;
  ms365ClientSecret?: string;
  /** Meta WhatsApp Cloud API */
  waPhoneNumberId?: string;
  waBusinessAccountId?: string;
  waAccessToken?: string;
  waAppSecret?: string;
  waVerifyToken?: string;
};

function encryptionKey(): Buffer {
  const secret =
    process.env.HELPDESK_CREDENTIALS_KEY?.trim() ||
    process.env.HELPDESK_SYNC_SECRET?.trim() ||
    "travelsuite-helpdesk-dev-key";
  return createHash("sha256").update(secret).digest();
}

/** Encrypt mailbox secrets for DB storage (AES-256-GCM). */
export function encryptMailboxCredentials(creds: HelpdeskMailboxCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(creds), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptMailboxCredentials(payload: string | null | undefined): HelpdeskMailboxCredentials {
  if (!payload?.trim()) return {};
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid mailbox credential payload");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(dec.toString("utf8")) as HelpdeskMailboxCredentials;
}

export function mergeMailboxCredentials(
  existingEnc: string | null | undefined,
  patch: HelpdeskMailboxCredentials
): string {
  const current = existingEnc ? decryptMailboxCredentials(existingEnc) : {};
  const next: HelpdeskMailboxCredentials = { ...current };
  if (patch.appPassword !== undefined && patch.appPassword.trim()) {
    next.appPassword = patch.appPassword.replace(/\s+/g, "");
  }
  if (patch.ms365TenantId !== undefined) next.ms365TenantId = patch.ms365TenantId.trim() || undefined;
  if (patch.ms365ClientId !== undefined) next.ms365ClientId = patch.ms365ClientId.trim() || undefined;
  if (patch.ms365ClientSecret !== undefined && patch.ms365ClientSecret.trim()) {
    next.ms365ClientSecret = patch.ms365ClientSecret.trim();
  }
  if (patch.waPhoneNumberId !== undefined) {
    next.waPhoneNumberId = patch.waPhoneNumberId.trim() || undefined;
  }
  if (patch.waBusinessAccountId !== undefined) {
    next.waBusinessAccountId = patch.waBusinessAccountId.trim() || undefined;
  }
  if (patch.waAccessToken !== undefined && patch.waAccessToken.trim()) {
    next.waAccessToken = patch.waAccessToken.trim();
  }
  if (patch.waAppSecret !== undefined && patch.waAppSecret.trim()) {
    next.waAppSecret = patch.waAppSecret.trim();
  }
  if (patch.waVerifyToken !== undefined && patch.waVerifyToken.trim()) {
    next.waVerifyToken = patch.waVerifyToken.trim();
  }
  return encryptMailboxCredentials(next);
}
