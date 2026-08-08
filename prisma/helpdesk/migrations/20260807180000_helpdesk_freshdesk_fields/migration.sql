-- Freshdesk-style ticket properties + internal note flags
ALTER TABLE "HelpdeskTicket" ADD COLUMN IF NOT EXISTS "DepartmentID" INTEGER;
ALTER TABLE "HelpdeskTicket" ADD COLUMN IF NOT EXISTS "DepartmentName" VARCHAR(200);
ALTER TABLE "HelpdeskTicket" ADD COLUMN IF NOT EXISTS "AssigneeUserID" INTEGER;
ALTER TABLE "HelpdeskTicket" ADD COLUMN IF NOT EXISTS "AssigneeName" VARCHAR(200);

CREATE INDEX IF NOT EXISTS "HelpdeskTicket_DepartmentID_idx" ON "HelpdeskTicket"("DepartmentID");
CREATE INDEX IF NOT EXISTS "HelpdeskTicket_AssigneeUserID_idx" ON "HelpdeskTicket"("AssigneeUserID");

ALTER TABLE "HelpdeskTicketMessage" ADD COLUMN IF NOT EXISTS "IsInternal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HelpdeskTicketMessage" ADD COLUMN IF NOT EXISTS "CreatedBy" INTEGER;
