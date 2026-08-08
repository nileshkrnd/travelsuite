-- Remove helpdesk tables from KlyraAdmin (moved to KlyraHelpdesk / HELPDESKCNX_URL)
DROP TABLE IF EXISTS "HelpdeskTicketMessage" CASCADE;
DROP TABLE IF EXISTS "HelpdeskTicket" CASCADE;
DROP TABLE IF EXISTS "HelpdeskMailbox" CASCADE;
