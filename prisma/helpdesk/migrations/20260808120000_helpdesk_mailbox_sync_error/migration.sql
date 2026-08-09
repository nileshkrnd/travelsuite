-- Persist last mailbox sync error for Ops MVP sync health.
ALTER TABLE "HelpdeskMailbox" ADD COLUMN IF NOT EXISTS "LastSyncError" VARCHAR(1000);
