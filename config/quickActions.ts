import type { ModuleKey } from "@/config/permissions";
import type { Role } from "@/types";

export interface QuickAction {
  label: string;
  icon: string;
  /** Module this action opens — path segment is resolved from MENU_ITEMS at render time. */
  module: ModuleKey;
}

export const QUICK_ACTIONS: Record<Role, QuickAction[]> = {
  company_employee: [
    { label: "Invite User", icon: "UserPlus", module: "users" },
    { label: "Review Bookings", icon: "ClipboardCheck", module: "bookings" },
  ],
  hotelier: [{ label: "Add Room Inventory", icon: "Plus", module: "inventory" }],
  supplier: [{ label: "Add Service", icon: "Plus", module: "inventory" }],
  dmc: [{ label: "Add Destination Package", icon: "Plus", module: "inventory" }],
  agent: [{ label: "New Booking", icon: "Plus", module: "bookings" }],
  sub_agent: [{ label: "New Booking", icon: "Plus", module: "bookings" }],
  corporate_customer: [{ label: "Approve Request", icon: "ClipboardCheck", module: "corporate" }],
};
