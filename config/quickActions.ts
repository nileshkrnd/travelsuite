import type { ModuleKey } from "@/config/permissions";
import type { RoleCategory, RoleDef } from "@/types";

export interface QuickAction {
  label: string;
  icon: string;
  /** Module this action opens — path segment is resolved from flatMenuItems() at render time. */
  module: ModuleKey;
}

const QUICK_ACTIONS_BY_ROLE_ID: Record<string, QuickAction[]> = {
  role_super_admin: [
    { label: "Register User", icon: "UserPlus", module: "users" },
    { label: "New Role", icon: "KeyRound", module: "roles" },
  ],
  role_administrator: [
    { label: "Register User", icon: "UserPlus", module: "users" },
    { label: "Review Bookings", icon: "ClipboardCheck", module: "bookings" },
  ],
  role_accountant: [{ label: "Review Billing", icon: "Receipt", module: "billing" }],
  role_cashier: [{ label: "Record Payment", icon: "Plus", module: "billing" }],
  role_agency_user: [{ label: "New Booking", icon: "Plus", module: "bookings" }],
  role_subagency_user: [{ label: "New Booking", icon: "Plus", module: "bookings" }],
  role_corporate_employee: [{ label: "Approve Request", icon: "ClipboardCheck", module: "corporate" }],
  role_supplier: [{ label: "Add Service", icon: "Plus", module: "inventory" }],
};

const QUICK_ACTIONS_BY_CATEGORY: Record<RoleCategory, QuickAction[]> = {
  internal: QUICK_ACTIONS_BY_ROLE_ID.role_administrator,
  agency: QUICK_ACTIONS_BY_ROLE_ID.role_agency_user,
  subAgency: QUICK_ACTIONS_BY_ROLE_ID.role_subagency_user,
  corporate: QUICK_ACTIONS_BY_ROLE_ID.role_corporate_employee,
  supplier: QUICK_ACTIONS_BY_ROLE_ID.role_supplier,
};

export function getQuickActions(roleDef: RoleDef): QuickAction[] {
  return QUICK_ACTIONS_BY_ROLE_ID[roleDef.id] ?? QUICK_ACTIONS_BY_CATEGORY[roleDef.category] ?? [];
}
