"use client";

import { Suspense } from "react";
import { AccessGate } from "@/components/shared/AccessGate";
import { TicketsList } from "@/app/(dashboard)/[role]/helpdesk/tickets/page";

function EmailTickets() {
  return (
    <AccessGate module="helpdeskEmail">
      {(roleDef) => <TicketsList roleDef={roleDef} forcedChannel="email" />}
    </AccessGate>
  );
}

export default function HelpdeskEmailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading email queue…</div>}>
      <EmailTickets />
    </Suspense>
  );
}
