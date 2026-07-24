"use client";

import { AccessGate } from "@/components/shared/AccessGate";
import { ModulePrototypePage } from "@/components/shared/ModulePrototypePage";

export default function BookingsPage() {
  return (
    <AccessGate module="salesBookings">
      {() => (
        <ModulePrototypePage
          moduleKey="salesBookings"
          title="Bookings"
          groupLabel="Sales"
          description="Sales booking pipeline and reservation overview"
        />
      )}
    </AccessGate>
  );
}
