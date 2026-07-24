"use client";

import { AccessGate } from "@/components/shared/AccessGate";
import { ModulePrototypePage } from "@/components/shared/ModulePrototypePage";

export default function BillingPage() {
  return (
    <AccessGate module="invoices">
      {() => (
        <ModulePrototypePage
          moduleKey="invoices"
          title="Billing & Invoices"
          groupLabel="Accounts"
          description="Customer invoices and billing status"
        />
      )}
    </AccessGate>
  );
}
