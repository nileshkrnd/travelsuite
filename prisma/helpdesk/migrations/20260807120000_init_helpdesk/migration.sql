-- Helpdesk: mailbox + tickets + messages (Microsoft 365 email → ticket)
CREATE TABLE IF NOT EXISTS "HelpdeskMailbox" (
    "MailboxID" SERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER,
    "MailboxAddress" VARCHAR(200) NOT NULL,
    "DisplayName" VARCHAR(200),
    "Provider" VARCHAR(50) NOT NULL DEFAULT 'microsoft365',
    "IsShared" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "LastSyncAt" TIMESTAMPTZ(6),
    "LastDeltaLink" TEXT,
    "CreatedBy" INTEGER,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "HelpdeskMailbox_pkey" PRIMARY KEY ("MailboxID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HelpdeskMailbox_Tenant_Address_key"
  ON "HelpdeskMailbox"("TenantID", "MailboxAddress");
CREATE INDEX IF NOT EXISTS "HelpdeskMailbox_TenantID_idx" ON "HelpdeskMailbox"("TenantID");

CREATE TABLE IF NOT EXISTS "HelpdeskTicket" (
    "TicketID" SERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER,
    "MailboxID" INTEGER,
    "TicketNumber" VARCHAR(40) NOT NULL,
    "Subject" VARCHAR(500) NOT NULL,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "Priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "Channel" VARCHAR(30) NOT NULL DEFAULT 'email',
    "RequesterName" VARCHAR(200),
    "RequesterEmail" VARCHAR(200),
    "ConversationID" VARCHAR(255),
    "LastMessageAt" TIMESTAMPTZ(6),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "HelpdeskTicket_pkey" PRIMARY KEY ("TicketID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HelpdeskTicket_Tenant_Number_key"
  ON "HelpdeskTicket"("TenantID", "TicketNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "HelpdeskTicket_Mailbox_Conversation_key"
  ON "HelpdeskTicket"("MailboxID", "ConversationID");
CREATE INDEX IF NOT EXISTS "HelpdeskTicket_Tenant_Status_idx"
  ON "HelpdeskTicket"("TenantID", "Status");
CREATE INDEX IF NOT EXISTS "HelpdeskTicket_LastMessageAt_idx"
  ON "HelpdeskTicket"("LastMessageAt");

DO $$ BEGIN
  ALTER TABLE "HelpdeskTicket"
    ADD CONSTRAINT "HelpdeskTicket_MailboxID_fkey"
    FOREIGN KEY ("MailboxID") REFERENCES "HelpdeskMailbox"("MailboxID")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "HelpdeskTicketMessage" (
    "TicketMessageID" SERIAL NOT NULL,
    "TicketID" INTEGER NOT NULL,
    "GraphMessageID" VARCHAR(255),
    "InternetMessageID" VARCHAR(500),
    "Direction" VARCHAR(20) NOT NULL DEFAULT 'inbound',
    "FromName" VARCHAR(200),
    "FromEmail" VARCHAR(200),
    "ToEmails" VARCHAR(1000),
    "Subject" VARCHAR(500),
    "BodyPreview" VARCHAR(1000),
    "BodyHtml" TEXT,
    "BodyText" TEXT,
    "ReceivedAt" TIMESTAMPTZ(6),
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HelpdeskTicketMessage_pkey" PRIMARY KEY ("TicketMessageID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HelpdeskTicketMessage_GraphMessageID_key"
  ON "HelpdeskTicketMessage"("GraphMessageID");
CREATE INDEX IF NOT EXISTS "HelpdeskTicketMessage_Ticket_Received_idx"
  ON "HelpdeskTicketMessage"("TicketID", "ReceivedAt");

DO $$ BEGIN
  ALTER TABLE "HelpdeskTicketMessage"
    ADD CONSTRAINT "HelpdeskTicketMessage_TicketID_fkey"
    FOREIGN KEY ("TicketID") REFERENCES "HelpdeskTicket"("TicketID")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
