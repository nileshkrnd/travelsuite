-- Multi-mailbox support credentials for Tenant Admin master
ALTER TABLE "HelpdeskMailbox" ADD COLUMN IF NOT EXISTS "SyncLookbackHours" INTEGER NOT NULL DEFAULT 720;
ALTER TABLE "HelpdeskMailbox" ADD COLUMN IF NOT EXISTS "ImapHost" VARCHAR(200);
ALTER TABLE "HelpdeskMailbox" ADD COLUMN IF NOT EXISTS "ImapPort" INTEGER;
ALTER TABLE "HelpdeskMailbox" ADD COLUMN IF NOT EXISTS "SmtpHost" VARCHAR(200);
ALTER TABLE "HelpdeskMailbox" ADD COLUMN IF NOT EXISTS "SmtpPort" INTEGER;
ALTER TABLE "HelpdeskMailbox" ADD COLUMN IF NOT EXISTS "CredentialsEnc" TEXT;

CREATE INDEX IF NOT EXISTS "HelpdeskMailbox_Tenant_Active_idx"
  ON "HelpdeskMailbox"("TenantID", "IsActive");
