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
    { label: "New Company", icon: "Building2", module: "company" },
    { label: "Register User", icon: "UserPlus", module: "users" },
    { label: "New Role", icon: "KeyRound", module: "roles" },
  ],
  role_hr: [{ label: "New Employee", icon: "UserPlus", module: "hrmsEmployees" }],
  role_sales: [{ label: "Book Offline Flight", icon: "Plane", module: "offlineFlight" }],
  role_back_office: [{ label: "New Quotation", icon: "FilePlus", module: "quotationBuilder" }],
  role_mid_office: [{ label: "Reservation Queue", icon: "ListOrdered", module: "reservationQueue" }],
  role_accounts: [
    { label: "Sales Voucher", icon: "ShoppingBag", module: "voucherSales" },
    { label: "Chart of Accounts", icon: "BookOpen", module: "chartOfAccounts" },
  ],
  role_crm: [{ label: "New Lead", icon: "Target", module: "crmLeads" }],
  role_agency_user: [{ label: "New Booking", icon: "Plus", module: "b2bBooking" }],
  role_corporate_employee: [{ label: "New Booking", icon: "Plus", module: "corporateBookings" }],
  role_supplier: [{ label: "Manage Rates", icon: "BadgeDollarSign", module: "rates" }],
};

const QUICK_ACTIONS_BY_CATEGORY: Record<RoleCategory, QuickAction[]> = {
  internal: QUICK_ACTIONS_BY_ROLE_ID.role_administrator,
  agency: QUICK_ACTIONS_BY_ROLE_ID.role_agency_user,
  subAgency: QUICK_ACTIONS_BY_ROLE_ID.role_agency_user,
  corporate: QUICK_ACTIONS_BY_ROLE_ID.role_corporate_employee,
  supplier: QUICK_ACTIONS_BY_ROLE_ID.role_supplier,
};

export function getQuickActions(roleDef: RoleDef): QuickAction[] {
  return QUICK_ACTIONS_BY_ROLE_ID[roleDef.id] ?? QUICK_ACTIONS_BY_CATEGORY[roleDef.category] ?? [];
}
