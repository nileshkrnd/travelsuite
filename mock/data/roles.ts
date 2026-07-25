import type { RoleDef } from "@/types";
import type { ModuleKey, PermissionAction } from "@/config/permissions";
import { allLeafModuleKeys } from "@/config/permissions";
import { toCamelSlug } from "@/lib/slug";
import { DEFAULT_TENANT_ID } from "./tenants";

const ALL_ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;

/** Grants the given actions (default: all) on every module key passed in. */
function grant(
  keys: ModuleKey[],
  actions: readonly PermissionAction[] = ALL_ACTIONS
): Partial<Record<ModuleKey, PermissionAction[]>> {
  return Object.fromEntries(keys.map((key) => [key, [...actions]])) as Partial<
    Record<ModuleKey, PermissionAction[]>
  >;
}

/** Shallow-merges several `grant()` results into one permissions map. */
function mergePermissions(
  ...grants: Partial<Record<ModuleKey, PermissionAction[]>>[]
): Partial<Record<ModuleKey, PermissionAction[]>> {
  return Object.assign({}, ...grants);
}

function seedRole(
  input: Omit<RoleDef, "id" | "tenantId" | "slug" | "isSystem" | "createdAt"> & { id: string }
): RoleDef {
  return {
    ...input,
    tenantId: DEFAULT_TENANT_ID,
    slug: toCamelSlug(input.name),
    isSystem: true,
    createdAt: "2023-11-01T09:00:00.000Z",
  };
}

// Module-key groups, mirroring the accordion groups in config/permissions.ts MENU_ITEMS.
const HRMS_KEYS: ModuleKey[] = [
  "hrmsDashboard",
  "hrmsEmployees",
  "attendance",
  "leave",
  "payroll",
  "recruitment",
  "performance",
  "letters",
  "gratuity",
  "settlement",
];
const SALES_KEYS: ModuleKey[] = [
  "salesDashboard",
  "salesCustomers",
  "salesLeads",
  "quotations",
  "salesBookings",
  "flight",
  "hotel",
  "transfer",
  "tours",
  "activities",
  "insurance",
  "visa",
  "carRental",
];
const BOOK_OFFLINE_KEYS: ModuleKey[] = [
  "offlineFlight",
  "offlineHotel",
  "offlineTransfer",
  "offlineRail",
  "offlineMiscellaneous",
];
const BOOK_ONLINE_KEYS: ModuleKey[] = ["onlineFlight", "onlineHotel", "onlineTransfer"];
const BACK_OFFICE_KEYS: ModuleKey[] = [
  "backOfficeDashboard",
  "quotationBuilder",
  "packageBuilder",
  "bookingQueue",
  "pendingBooking",
  "confirmedBooking",
  "holdBooking",
  "cancelledBooking",
  "amendments",
];
const MID_OFFICE_KEYS: ModuleKey[] = [
  "midOfficeDashboard",
  "reservationQueue",
  "ticketing",
  "hotelOps",
  "flightOps",
  "transferOps",
  "visaOps",
  "qcQueue",
  "refunds",
  "reissue",
];
const EXTRANET_KEYS: ModuleKey[] = [
  "extranetDashboard",
  "contracts",
  "extranetInventory",
  "rates",
  "promotions",
  "stopSales",
  "blackoutDates",
  "extranetBookings",
];
const ACCOUNTS_KEYS: ModuleKey[] = [
  "accountsDashboard",
  "chartOfAccounts",
  "journal",
  "payments",
  "receipts",
  "invoices",
  "bank",
  "accountsReports",
];
const CRM_KEYS: ModuleKey[] = [
  "crmDashboard",
  "crmLeads",
  "opportunities",
  "crmCustomers",
  "campaigns",
  "supportTickets",
];
const B2B_KEYS: ModuleKey[] = ["b2bDashboard", "b2bBooking", "b2bWallet", "b2bStatements", "b2bReports"];
const CORPORATE_KEYS: ModuleKey[] = [
  "corporateDashboard",
  "corporateEmployees",
  "corporateBookings",
  "corporateApprovals",
  "corporatePolicies",
  "corporateReports",
];
export const roles: RoleDef[] = [
  seedRole({
    id: "role_super_admin",
    name: "Super Admin",
    description:
      "Full platform control — every tenant, every company, every module. Switch workspaces from the top bar.",
    category: "internal",
    permissions: grant(allLeafModuleKeys()),
  }),
  seedRole({
    id: "role_administrator",
    name: "Tenant Admin",
    description:
      "Owns one tenant end-to-end — companies, branches, masters, roles, and every operating module. Cannot switch tenants.",
    category: "internal",
    // Full product surface within the assigned tenant — no multi-tenant registry.
    permissions: grant(allLeafModuleKeys().filter((key) => key !== "tenantProfile")),
  }),
  seedRole({
    id: "role_hr",
    name: "HR",
    description: "Manages the employee lifecycle — attendance, leave, payroll, and recruitment.",
    category: "internal",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(HRMS_KEYS),
      grant(["employee"]),
      grant(["company", "branch", "department"], ["view"]),
      grant(["settings"], ["view", "edit"])
    ),
  }),
  seedRole({
    id: "role_sales",
    name: "POS",
    description: "Point of Sales — front-desk bookings, quotations, and walk-in customers across every product line.",
    category: "internal",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(SALES_KEYS),
      grant(BOOK_OFFLINE_KEYS),
      grant(BOOK_ONLINE_KEYS),
      grant(["settings"], ["view", "edit"])
    ),
  }),
  seedRole({
    id: "role_back_office",
    name: "Back Office",
    description: "Builds quotations and packages, and processes the booking queue end to end.",
    category: "internal",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(BACK_OFFICE_KEYS),
      grant(BOOK_OFFLINE_KEYS),
      grant(["settings"], ["view", "edit"])
    ),
  }),
  seedRole({
    id: "role_mid_office",
    name: "Mid Office",
    description: "Ticketing and reservation operations — confirmations, QC, refunds, and reissues.",
    category: "internal",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(MID_OFFICE_KEYS),
      grant(BOOK_ONLINE_KEYS, ["view"]),
      grant(["settings"], ["view", "edit"])
    ),
  }),
  seedRole({
    id: "role_accounts",
    name: "Finance",
    description: "Full finance module — chart of accounts, journals, payments, receipts, and reporting.",
    category: "internal",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(ACCOUNTS_KEYS),
      grant(["reportFinance"], ["view"]),
      grant(["settings"], ["view", "edit"])
    ),
  }),
  seedRole({
    id: "role_crm",
    name: "CRM",
    description: "Owns customer relationships — leads, opportunities, campaigns, and support.",
    category: "internal",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(CRM_KEYS),
      grant(["settings"], ["view", "edit"])
    ),
  }),
  seedRole({
    id: "role_supplier",
    name: "Extranet Supplier",
    description: "Inventory partner — manages contracts, rates, and availability via the extranet.",
    category: "supplier",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(EXTRANET_KEYS),
      grant(["settings"], ["view", "edit"])
    ),
  }),
  seedRole({
    id: "role_agency_user",
    name: "B2B Agent",
    description: "Travel agency staff booking through the B2B portal, with wallet and statements.",
    category: "agency",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(B2B_KEYS),
      grant(["settings"], ["view", "edit"])
    ),
  }),
  seedRole({
    id: "role_corporate_employee",
    name: "Corporate User",
    description: "Books travel on behalf of their company, subject to travel policy approval.",
    category: "corporate",
    permissions: mergePermissions(
      grant(["dashboard"], ["view"]),
      grant(CORPORATE_KEYS),
      grant(["settings"], ["view", "edit"])
    ),
  }),
];

export const SUPER_ADMIN_ROLE_ID = "role_super_admin";
/** Tenant-scoped admin — full menus under one tenant (legacy id kept for demo logins). */
export const TENANT_ADMIN_ROLE_ID = "role_administrator";
