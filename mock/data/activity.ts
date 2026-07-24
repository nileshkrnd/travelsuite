import type { ActivityItem } from "@/types";
import type { ModuleKey } from "@/config/permissions";
import { DEFAULT_TENANT_ID } from "./tenants";
import { users } from "./users";

const TEMPLATES: { module: ModuleKey; action: string }[] = [
  { module: "bookings", action: "created a new booking" },
  { module: "bookings", action: "confirmed a booking" },
  { module: "inventory", action: "updated inventory availability" },
  { module: "corporate", action: "approved a travel request" },
  { module: "billing", action: "generated an invoice" },
  { module: "users", action: "invited a new team member" },
  { module: "agents", action: "updated a commission structure" },
  { module: "bookings", action: "cancelled a booking" },
  { module: "reports", action: "exported a report" },
  { module: "settings", action: "updated notification preferences" },
];

const ANCHOR = new Date("2026-07-22T15:00:00.000Z");

function generateActivity(): ActivityItem[] {
  return TEMPLATES.map((template, i) => {
    const actor = users[i % users.length];
    const hoursAgo = i === 0 ? 1 : i * 7;
    const timestamp = new Date(ANCHOR.getTime() - hoursAgo * 60 * 60 * 1000);

    return {
      id: `act_${String(i + 1).padStart(3, "0")}`,
      tenantId: DEFAULT_TENANT_ID,
      actorName: actor.name,
      action: template.action,
      module: template.module,
      timestamp: timestamp.toISOString(),
    };
  });
}

export const activity: ActivityItem[] = generateActivity();
