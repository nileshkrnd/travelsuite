"use client";

import { Suspense } from "react";
import { AccessGate } from "@/components/shared/AccessGate";
import { TicketsList } from "@/app/(dashboard)/[role]/helpdesk/tickets/page";

function WhatsAppTickets() {
  return (
    <AccessGate module="helpdeskWhatsApp">
      {(roleDef) => <TicketsList roleDef={roleDef} forcedChannel="whatsapp" />}
    </AccessGate>
  );
}

export default function HelpdeskWhatsAppPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-muted-foreground">Loading WhatsApp queue…</div>}
    >
      <WhatsAppTickets />
    </Suspense>
  );
}
