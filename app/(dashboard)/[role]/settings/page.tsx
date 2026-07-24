"use client";

import { AccessGate } from "@/components/shared/AccessGate";
import { ModulePrototypePage } from "@/components/shared/ModulePrototypePage";

export default function SettingsPage() {
  return (
    <AccessGate module="settings">
      {() => (
        <ModulePrototypePage
          moduleKey="settings"
          title="Settings"
          description="Workspace preferences and account settings"
        />
      )}
    </AccessGate>
  );
}
