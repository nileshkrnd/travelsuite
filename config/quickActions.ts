import type { ModuleKey } from "@/config/permissions";
import type { RoleDef, ScopeKind } from "@/types";

export interface QuickAction {
  label: string;
  icon: string;
  /** Module this action opens — path segment is resolved from flatMenuItems() at render time. */
  module: ModuleKey;
}

const QUICK_ACTIONS_BY_ROLE_ID: Record<string, QuickAction[]> = {
  role_super_admin: [
    { label: "Register Employee", icon: "UserPlus", module: "employee" },
    { label: "New Role", icon: "KeyRound", module: "roles" },
  ],
  role_company_employee: [
    { label: "Register Employee", icon: "UserPlus", module: "employee" },
    { label: "Review Bookings", icon: "ClipboardCheck", module: "bookings" },
  ],
  role_hotelier: [{ label: "Add Room Inventory", icon: "Plus", module: "inventory" }],
  role_supplier: [{ label: "Add Service", icon: "Plus", module: "inventory" }],
  role_dmc: [{ label: "Add Destination Package", icon: "Plus", module: "inventory" }],
  role_agent: [{ label: "New Booking", icon: "Plus", module: "bookings" }],
  role_sub_agent: [{ label: "New Booking", icon: "Plus", module: "bookings" }],
  role_corporate_customer: [{ label: "Approve Request", icon: "ClipboardCheck", module: "corporate" }],
};

const QUICK_ACTIONS_BY_SCOPE: Record<ScopeKind, QuickAction[]> = {
  all: QUICK_ACTIONS_BY_ROLE_ID.role_company_employee,
  agent: QUICK_ACTIONS_BY_ROLE_ID.role_agent,
  subAgent: QUICK_ACTIONS_BY_ROLE_ID.role_sub_agent,
  hotelier: QUICK_ACTIONS_BY_ROLE_ID.role_hotelier,
  supplier: QUICK_ACTIONS_BY_ROLE_ID.role_supplier,
  dmc: QUICK_ACTIONS_BY_ROLE_ID.role_dmc,
  corporate: QUICK_ACTIONS_BY_ROLE_ID.role_corporate_customer,
};

export function getQuickActions(roleDef: RoleDef): QuickAction[] {
  return QUICK_ACTIONS_BY_ROLE_ID[roleDef.id] ?? QUICK_ACTIONS_BY_SCOPE[roleDef.scopeKind] ?? [];
}
