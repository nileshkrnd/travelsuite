"use client";

import { AccessGate } from "@/components/shared/AccessGate";
import { ModulePrototypePage } from "@/components/shared/ModulePrototypePage";

export default function AgentsPage() {
  return (
    <AccessGate module="agency">
      {() => (
        <ModulePrototypePage
          moduleKey="agency"
          title="Agents & Sub-Agents"
          groupLabel="Partners"
          description="B2B agency network overview"
        />
      )}
    </AccessGate>
  );
}
