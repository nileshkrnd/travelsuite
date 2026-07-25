import type { RoleDef } from "@/types";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export type ModuleKey =
  | "dashboard"
  // Administration
  | "administration"
  | "company"
  | "branch"
  | "branchType"
  | "department"
  | "designation"
  | "employee"
  | "roles"
  | "accessRole"
  | "permissions"
  | "users"
  | "approvalMatrix"
  | "holidays"
  | "mastersHub"
  | "tenantProfile"
  | "globalTenantSettings"
  | "country"
  | "city"
  | "region"
  | "currency"
  | "airlineType"
  | "airline"
  | "airport"
  | "product"
  | "partners"
  | "agency"
  | "subAgency"
  | "corporateAccounts"
  | "supplier"
  // HRMS
  | "hrms"
  | "hrmsDashboard"
  | "hrmsEmployees"
  | "attendance"
  | "leave"
  | "payroll"
  | "recruitment"
  | "performance"
  | "letters"
  | "gratuity"
  | "settlement"
  // POS — Point of Sales
  | "sales"
  | "salesDashboard"
  | "salesCustomers"
  | "salesLeads"
  | "quotations"
  | "salesBookings"
  | "flight"
  | "hotel"
  | "transfer"
  | "tours"
  | "activities"
  | "insurance"
  | "visa"
  | "carRental"
  // Book Offline
  | "bookOffline"
  | "offlineFlight"
  | "offlineHotel"
  | "offlineTransfer"
  | "offlineRail"
  | "offlineMiscellaneous"
  // Book Online
  | "bookOnline"
  | "onlineFlight"
  | "onlineHotel"
  | "onlineTransfer"
  // Back Office
  | "backOffice"
  | "backOfficeDashboard"
  | "quotationBuilder"
  | "packageBuilder"
  | "bookingQueue"
  | "pendingBooking"
  | "confirmedBooking"
  | "holdBooking"
  | "cancelledBooking"
  | "amendments"
  // Mid Office
  | "midOffice"
  | "midOfficeDashboard"
  | "reservationQueue"
  | "ticketing"
  | "hotelOps"
  | "flightOps"
  | "transferOps"
  | "visaOps"
  | "qcQueue"
  | "refunds"
  | "reissue"
  // Extranet
  | "extranet"
  | "extranetDashboard"
  | "contracts"
  | "extranetInventory"
  | "rates"
  | "promotions"
  | "stopSales"
  | "blackoutDates"
  | "extranetBookings"
  // Asset Management
  | "assets"
  | "assetsDashboard"
  | "assetList"
  | "assetCategories"
  | "assetAssignment"
  | "maintenance"
  | "depreciation"
  // Inventory
  | "inventory"
  | "inventoryDashboard"
  | "warehouse"
  | "products"
  | "purchaseOrders"
  | "stockIn"
  | "stockOut"
  | "stockTransfers"
  // Accounts
  | "accounts"
  | "accountsDashboard"
  | "chartOfAccounts"
  | "journal"
  | "payments"
  | "receipts"
  | "invoices"
  | "bank"
  | "accountsReports"
  // CRM
  | "crm"
  | "crmDashboard"
  | "crmLeads"
  | "opportunities"
  | "crmCustomers"
  | "campaigns"
  | "supportTickets"
  // B2B Portal
  | "b2b"
  | "b2bDashboard"
  | "b2bBooking"
  | "b2bWallet"
  | "b2bStatements"
  | "b2bReports"
  // Corporate (CBT)
  | "corporate"
  | "corporateDashboard"
  | "corporateEmployees"
  | "corporateBookings"
  | "corporateApprovals"
  | "corporatePolicies"
  | "corporateReports"
  // Reports
  | "reports"
  | "reportSales"
  | "reportFinance"
  | "reportOperations"
  | "reportHr"
  | "reportCrm"
  | "reportInventory"
  | "reportAssets"
  // Settings / legacy stubs still routed
  | "settings"
  | "bookings"
  | "agents"
  | "billing";

export interface MenuItem {
  key: ModuleKey;
  labelKey: string;
  icon: string;
  /** Path segment appended after /(dashboard)/[role]/ */
  path: string;
  /** Group items render as an expandable accordion; key/path are unused for navigation. */
  children?: MenuItem[];
}

/**
 * Super Admin platform settings (no tenant selected).
 * Tenant registration + global Country / City / Currency / Region + Users
 * (Super Admin / Tenant Admin accounts only — employee logins come from Employee master).
 */
export const GLOBAL_TENANT_SETTING_KEYS: ModuleKey[] = [
  "tenantProfile",
  "country",
  "city",
  "region",
  "currency",
  "airlineType",
  "airline",
  "airport",
  "users",
];

/** Menu keys visible when Super Admin is in platform mode (no specific tenant). */
const PLATFORM_MODE_MENU_KEYS = new Set<ModuleKey>([
  "dashboard",
  "globalTenantSettings",
  ...GLOBAL_TENANT_SETTING_KEYS,
  "accessRole",
]);

export const MENU_ITEMS: MenuItem[] = [
  { key: "dashboard", labelKey: "sidebar.dashboard", icon: "LayoutDashboard", path: "dashboard" },
  {
    key: "globalTenantSettings",
    labelKey: "sidebar.globalTenantSettings",
    icon: "Globe2",
    path: "global-tenant-settings",
    children: [
      { key: "tenantProfile", labelKey: "sidebar.tenantProfile", icon: "Building", path: "masters/tenant" },
      { key: "country", labelKey: "sidebar.country", icon: "Globe", path: "masters/country" },
      { key: "city", labelKey: "sidebar.city", icon: "MapPinned", path: "masters/city" },
      { key: "region", labelKey: "sidebar.region", icon: "Landmark", path: "masters/region" },
      { key: "currency", labelKey: "sidebar.currency", icon: "Coins", path: "masters/currency" },
      { key: "airlineType", labelKey: "sidebar.airlineType", icon: "Tags", path: "masters/airline-type" },
      { key: "airline", labelKey: "sidebar.airline", icon: "Plane", path: "masters/airline" },
      { key: "airport", labelKey: "sidebar.airport", icon: "MapPinned", path: "masters/airport" },
      { key: "users", labelKey: "sidebar.users", icon: "Users", path: "masters/users" },
      { key: "accessRole", labelKey: "sidebar.accessRole", icon: "KeyRound", path: "masters/access-role" },
    ],
  },
  {
    key: "administration",
    labelKey: "sidebar.administration",
    icon: "ShieldCheck",
    path: "administration",
    children: [
      { key: "company", labelKey: "sidebar.company", icon: "Building2", path: "masters/company" },
      { key: "branch", labelKey: "sidebar.branch", icon: "GitBranch", path: "masters/branch" },
      { key: "branchType", labelKey: "sidebar.branchType", icon: "ListTree", path: "masters/branch-type" },
      { key: "department", labelKey: "sidebar.department", icon: "Network", path: "masters/department" },
      { key: "designation", labelKey: "sidebar.designation", icon: "Briefcase", path: "masters/designation" },
      { key: "employee", labelKey: "sidebar.employee", icon: "UserCog", path: "masters/employee" },
      { key: "accessRole", labelKey: "sidebar.accessRole", icon: "KeyRound", path: "masters/access-role" },
      { key: "roles", labelKey: "sidebar.roles", icon: "KeyRound", path: "masters/roles" },
      { key: "permissions", labelKey: "sidebar.permissions", icon: "Lock", path: "administration/permissions" },
      { key: "approvalMatrix", labelKey: "sidebar.approvalMatrix", icon: "ClipboardCheck", path: "administration/approval-matrix" },
      { key: "holidays", labelKey: "sidebar.holidays", icon: "CalendarDays", path: "administration/holidays" },
      { key: "mastersHub", labelKey: "sidebar.mastersHub", icon: "Layers", path: "administration/masters" },
      { key: "product", labelKey: "sidebar.product", icon: "Package", path: "masters/product" },
    ],
  },
  {
    key: "partners",
    labelKey: "sidebar.partners",
    icon: "Handshake",
    path: "partners",
    children: [
      { key: "agency", labelKey: "sidebar.agency", icon: "Users2", path: "masters/agency" },
      { key: "subAgency", labelKey: "sidebar.subAgency", icon: "GitFork", path: "masters/subAgency" },
      { key: "corporateAccounts", labelKey: "sidebar.corporateAccounts", icon: "Landmark", path: "masters/corporateAccounts" },
      { key: "supplier", labelKey: "sidebar.supplier", icon: "Store", path: "masters/supplier" },
    ],
  },
  {
    key: "hrms",
    labelKey: "sidebar.hrms",
    icon: "Users",
    path: "hrms",
    children: [
      { key: "hrmsDashboard", labelKey: "sidebar.hrmsDashboard", icon: "LayoutDashboard", path: "hrms/dashboard" },
      { key: "hrmsEmployees", labelKey: "sidebar.hrmsEmployees", icon: "UserCog", path: "hrms/employees" },
      { key: "attendance", labelKey: "sidebar.attendance", icon: "Clock", path: "hrms/attendance" },
      { key: "leave", labelKey: "sidebar.leave", icon: "PalmTree", path: "hrms/leave" },
      { key: "payroll", labelKey: "sidebar.payroll", icon: "Wallet", path: "hrms/payroll" },
      { key: "recruitment", labelKey: "sidebar.recruitment", icon: "UserPlus", path: "hrms/recruitment" },
      { key: "performance", labelKey: "sidebar.performance", icon: "TrendingUp", path: "hrms/performance" },
      { key: "letters", labelKey: "sidebar.letters", icon: "FileText", path: "hrms/letters" },
      { key: "gratuity", labelKey: "sidebar.gratuity", icon: "Gift", path: "hrms/gratuity" },
      { key: "settlement", labelKey: "sidebar.settlement", icon: "Scale", path: "hrms/settlement" },
    ],
  },
  {
    key: "sales",
    labelKey: "sidebar.sales",
    icon: "Store",
    path: "sales",
    children: [
      { key: "salesDashboard", labelKey: "sidebar.salesDashboard", icon: "LayoutDashboard", path: "sales/dashboard" },
      {
        key: "bookOffline",
        labelKey: "sidebar.bookOffline",
        icon: "BookMarked",
        path: "book-offline",
        children: [
          { key: "offlineFlight", labelKey: "sidebar.offlineFlight", icon: "Plane", path: "book-offline/flight" },
          { key: "offlineHotel", labelKey: "sidebar.offlineHotel", icon: "BedDouble", path: "book-offline/hotel" },
          { key: "offlineTransfer", labelKey: "sidebar.offlineTransfer", icon: "Car", path: "book-offline/transfer" },
          { key: "offlineRail", labelKey: "sidebar.offlineRail", icon: "TrainFront", path: "book-offline/rail" },
          { key: "offlineMiscellaneous", labelKey: "sidebar.offlineMiscellaneous", icon: "MoreHorizontal", path: "book-offline/miscellaneous" },
        ],
      },
      {
        key: "bookOnline",
        labelKey: "sidebar.bookOnline",
        icon: "Globe",
        path: "book-online",
        children: [
          { key: "onlineFlight", labelKey: "sidebar.onlineFlight", icon: "Plane", path: "book-online/flight" },
          { key: "onlineHotel", labelKey: "sidebar.onlineHotel", icon: "BedDouble", path: "book-online/hotel" },
          { key: "onlineTransfer", labelKey: "sidebar.onlineTransfer", icon: "Car", path: "book-online/transfer" },
        ],
      },
    ],
  },
  {
    key: "backOffice",
    labelKey: "sidebar.backOffice",
    icon: "Briefcase",
    path: "back-office",
    children: [
      { key: "backOfficeDashboard", labelKey: "sidebar.backOfficeDashboard", icon: "LayoutDashboard", path: "back-office/dashboard" },
      { key: "quotationBuilder", labelKey: "sidebar.quotationBuilder", icon: "FilePlus", path: "back-office/quotation-builder" },
      { key: "packageBuilder", labelKey: "sidebar.packageBuilder", icon: "Package", path: "back-office/package-builder" },
      { key: "bookingQueue", labelKey: "sidebar.bookingQueue", icon: "ListOrdered", path: "back-office/booking-queue" },
      { key: "pendingBooking", labelKey: "sidebar.pendingBooking", icon: "Hourglass", path: "back-office/pending" },
      { key: "confirmedBooking", labelKey: "sidebar.confirmedBooking", icon: "CheckCircle2", path: "back-office/confirmed" },
      { key: "holdBooking", labelKey: "sidebar.holdBooking", icon: "PauseCircle", path: "back-office/hold" },
      { key: "cancelledBooking", labelKey: "sidebar.cancelledBooking", icon: "XCircle", path: "back-office/cancelled" },
      { key: "amendments", labelKey: "sidebar.amendments", icon: "Pencil", path: "back-office/amendments" },
    ],
  },
  {
    key: "midOffice",
    labelKey: "sidebar.midOffice",
    icon: "Workflow",
    path: "mid-office",
    children: [
      { key: "midOfficeDashboard", labelKey: "sidebar.midOfficeDashboard", icon: "LayoutDashboard", path: "mid-office/dashboard" },
      { key: "reservationQueue", labelKey: "sidebar.reservationQueue", icon: "ListOrdered", path: "mid-office/reservation-queue" },
      { key: "ticketing", labelKey: "sidebar.ticketing", icon: "Ticket", path: "mid-office/ticketing" },
      { key: "hotelOps", labelKey: "sidebar.hotelOps", icon: "BedDouble", path: "mid-office/hotel-ops" },
      { key: "flightOps", labelKey: "sidebar.flightOps", icon: "Plane", path: "mid-office/flight-ops" },
      { key: "transferOps", labelKey: "sidebar.transferOps", icon: "Car", path: "mid-office/transfer-ops" },
      { key: "visaOps", labelKey: "sidebar.visaOps", icon: "Stamp", path: "mid-office/visa-ops" },
      { key: "qcQueue", labelKey: "sidebar.qcQueue", icon: "SearchCheck", path: "mid-office/qc-queue" },
      { key: "refunds", labelKey: "sidebar.refunds", icon: "Undo2", path: "mid-office/refunds" },
      { key: "reissue", labelKey: "sidebar.reissue", icon: "RefreshCw", path: "mid-office/reissue" },
    ],
  },
  {
    key: "extranet",
    labelKey: "sidebar.extranet",
    icon: "Globe2",
    path: "extranet",
    children: [
      { key: "extranetDashboard", labelKey: "sidebar.extranetDashboard", icon: "LayoutDashboard", path: "extranet/dashboard" },
      { key: "contracts", labelKey: "sidebar.contracts", icon: "FileSignature", path: "extranet/contracts" },
      { key: "extranetInventory", labelKey: "sidebar.extranetInventory", icon: "Boxes", path: "extranet/inventory" },
      { key: "rates", labelKey: "sidebar.rates", icon: "BadgeDollarSign", path: "extranet/rates" },
      { key: "promotions", labelKey: "sidebar.promotions", icon: "Megaphone", path: "extranet/promotions" },
      { key: "stopSales", labelKey: "sidebar.stopSales", icon: "Ban", path: "extranet/stop-sales" },
      { key: "blackoutDates", labelKey: "sidebar.blackoutDates", icon: "CalendarOff", path: "extranet/blackout-dates" },
      { key: "extranetBookings", labelKey: "sidebar.extranetBookings", icon: "CalendarCheck", path: "extranet/bookings" },
    ],
  },
  {
    key: "assets",
    labelKey: "sidebar.assets",
    icon: "Laptop",
    path: "assets",
    children: [
      { key: "assetsDashboard", labelKey: "sidebar.assetsDashboard", icon: "LayoutDashboard", path: "assets/dashboard" },
      { key: "assetList", labelKey: "sidebar.assetList", icon: "Package", path: "assets/list" },
      { key: "assetCategories", labelKey: "sidebar.assetCategories", icon: "Tags", path: "assets/categories" },
      { key: "assetAssignment", labelKey: "sidebar.assetAssignment", icon: "UserCheck", path: "assets/assignment" },
      { key: "maintenance", labelKey: "sidebar.maintenance", icon: "Wrench", path: "assets/maintenance" },
      { key: "depreciation", labelKey: "sidebar.depreciation", icon: "TrendingDown", path: "assets/depreciation" },
    ],
  },
  {
    key: "inventory",
    labelKey: "sidebar.inventory",
    icon: "Warehouse",
    path: "inventory",
    children: [
      { key: "inventoryDashboard", labelKey: "sidebar.inventoryDashboard", icon: "LayoutDashboard", path: "inventory/dashboard" },
      { key: "warehouse", labelKey: "sidebar.warehouse", icon: "Warehouse", path: "inventory/warehouse" },
      { key: "products", labelKey: "sidebar.products", icon: "Package", path: "inventory/products" },
      { key: "purchaseOrders", labelKey: "sidebar.purchaseOrders", icon: "ShoppingCart", path: "inventory/purchase-orders" },
      { key: "stockIn", labelKey: "sidebar.stockIn", icon: "ArrowDownToLine", path: "inventory/stock-in" },
      { key: "stockOut", labelKey: "sidebar.stockOut", icon: "ArrowUpFromLine", path: "inventory/stock-out" },
      { key: "stockTransfers", labelKey: "sidebar.stockTransfers", icon: "ArrowLeftRight", path: "inventory/transfers" },
    ],
  },
  {
    key: "accounts",
    labelKey: "sidebar.accounts",
    icon: "Landmark",
    path: "accounts",
    children: [
      { key: "accountsDashboard", labelKey: "sidebar.accountsDashboard", icon: "LayoutDashboard", path: "accounts/dashboard" },
      { key: "chartOfAccounts", labelKey: "sidebar.chartOfAccounts", icon: "BookOpen", path: "accounts/chart-of-accounts" },
      { key: "journal", labelKey: "sidebar.journal", icon: "BookMarked", path: "accounts/journal" },
      { key: "payments", labelKey: "sidebar.payments", icon: "CreditCard", path: "accounts/payments" },
      { key: "receipts", labelKey: "sidebar.receipts", icon: "Receipt", path: "accounts/receipts" },
      { key: "invoices", labelKey: "sidebar.invoices", icon: "FileSpreadsheet", path: "accounts/invoices" },
      { key: "bank", labelKey: "sidebar.bank", icon: "Building", path: "accounts/bank" },
      { key: "accountsReports", labelKey: "sidebar.accountsReports", icon: "BarChart3", path: "accounts/reports" },
    ],
  },
  {
    key: "crm",
    labelKey: "sidebar.crm",
    icon: "HeartHandshake",
    path: "crm",
    children: [
      { key: "crmDashboard", labelKey: "sidebar.crmDashboard", icon: "LayoutDashboard", path: "crm/dashboard" },
      { key: "crmLeads", labelKey: "sidebar.crmLeads", icon: "Target", path: "crm/leads" },
      { key: "opportunities", labelKey: "sidebar.opportunities", icon: "TrendingUp", path: "crm/opportunities" },
      { key: "crmCustomers", labelKey: "sidebar.crmCustomers", icon: "Users", path: "crm/customers" },
      { key: "campaigns", labelKey: "sidebar.campaigns", icon: "Megaphone", path: "crm/campaigns" },
      { key: "supportTickets", labelKey: "sidebar.supportTickets", icon: "Headphones", path: "crm/support-tickets" },
    ],
  },
  {
    key: "b2b",
    labelKey: "sidebar.b2b",
    icon: "Network",
    path: "b2b",
    children: [
      { key: "b2bDashboard", labelKey: "sidebar.b2bDashboard", icon: "LayoutDashboard", path: "b2b/dashboard" },
      { key: "b2bBooking", labelKey: "sidebar.b2bBooking", icon: "CalendarCheck", path: "b2b/booking" },
      { key: "b2bWallet", labelKey: "sidebar.b2bWallet", icon: "Wallet", path: "b2b/wallet" },
      { key: "b2bStatements", labelKey: "sidebar.b2bStatements", icon: "FileSpreadsheet", path: "b2b/statements" },
      { key: "b2bReports", labelKey: "sidebar.b2bReports", icon: "BarChart3", path: "b2b/reports" },
    ],
  },
  {
    key: "corporate",
    labelKey: "sidebar.corporate",
    icon: "Briefcase",
    path: "corporate",
    children: [
      { key: "corporateDashboard", labelKey: "sidebar.corporateDashboard", icon: "LayoutDashboard", path: "corporate/dashboard" },
      { key: "corporateEmployees", labelKey: "sidebar.corporateEmployees", icon: "Users", path: "corporate/employees" },
      { key: "corporateBookings", labelKey: "sidebar.corporateBookings", icon: "CalendarCheck", path: "corporate/bookings" },
      { key: "corporateApprovals", labelKey: "sidebar.corporateApprovals", icon: "ClipboardCheck", path: "corporate/approvals" },
      { key: "corporatePolicies", labelKey: "sidebar.corporatePolicies", icon: "ScrollText", path: "corporate/policies" },
      { key: "corporateReports", labelKey: "sidebar.corporateReports", icon: "BarChart3", path: "corporate/reports" },
    ],
  },
  {
    key: "reports",
    labelKey: "sidebar.reports",
    icon: "BarChart3",
    path: "reports",
    children: [
      { key: "reportSales", labelKey: "sidebar.reportSales", icon: "ShoppingBag", path: "reports/sales" },
      { key: "reportFinance", labelKey: "sidebar.reportFinance", icon: "Landmark", path: "reports/finance" },
      { key: "reportOperations", labelKey: "sidebar.reportOperations", icon: "Workflow", path: "reports/operations" },
      { key: "reportHr", labelKey: "sidebar.reportHr", icon: "Users", path: "reports/hr" },
      { key: "reportCrm", labelKey: "sidebar.reportCrm", icon: "HeartHandshake", path: "reports/crm" },
      { key: "reportInventory", labelKey: "sidebar.reportInventory", icon: "Warehouse", path: "reports/inventory" },
      { key: "reportAssets", labelKey: "sidebar.reportAssets", icon: "Laptop", path: "reports/assets" },
    ],
  },
  { key: "settings", labelKey: "sidebar.settings", icon: "Settings", path: "settings" },
];

/** Flat lookup by ModuleKey, including nested group children — used by Topbar/menu lookups. */
export function findMenuItem(key: ModuleKey): MenuItem | undefined {
  function search(items: MenuItem[]): MenuItem | undefined {
    for (const item of items) {
      if (item.key === key) return item;
      const nested = item.children ? search(item.children) : undefined;
      if (nested) return nested;
    }
    return undefined;
  }
  return search(MENU_ITEMS);
}

/** Resolve a menu leaf by its path segment (e.g. "sales/customers"). */
export function findMenuItemByPath(path: string): MenuItem | undefined {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return flatMenuItems().find((item) => item.path === normalized);
}

/** Flat list of every navigable leaf (nested group nodes excluded). */
export function flatMenuItems(): MenuItem[] {
  function leaves(items: MenuItem[]): MenuItem[] {
    return items.flatMap((item) => (item.children ? leaves(item.children) : [item]));
  }
  return leaves(MENU_ITEMS);
}

/** Top-level menu group that contains a leaf/sub-group key (for breadcrumbs / topbar). */
export function findTopMenuGroup(key: ModuleKey): MenuItem | undefined {
  function contains(items: MenuItem[] | undefined, target: ModuleKey): boolean {
    if (!items) return false;
    return items.some((item) => item.key === target || contains(item.children, target));
  }
  return MENU_ITEMS.find((group) => group.key === key || contains(group.children, key));
}

export function can(roleDef: RoleDef | undefined, module: ModuleKey, action: PermissionAction): boolean {
  if (!roleDef) return false;
  return roleDef.permissions[module]?.includes(action) ?? false;
}

export function getMenuForRole(
  roleDef: RoleDef | undefined,
  options?: { platformMode?: boolean }
): MenuItem[] {
  if (!roleDef) return [];
  const role = roleDef;
  const platformMode = !!options?.platformMode && role.id === SUPER_ADMIN_ROLE_ID;

  function filterItems(items: MenuItem[]): MenuItem[] {
    return items.reduce<MenuItem[]>((acc, item) => {
      // Platform masters (incl. Users) only when Super Admin has no tenant selected.
      if (!platformMode && (item.key === "globalTenantSettings" || GLOBAL_TENANT_SETTING_KEYS.includes(item.key))) {
        return acc;
      }

      if (platformMode && !PLATFORM_MODE_MENU_KEYS.has(item.key) && !item.children) {
        return acc;
      }

      if (item.children) {
        if (platformMode && !PLATFORM_MODE_MENU_KEYS.has(item.key)) return acc;
        const visibleChildren = filterItems(item.children);
        if (visibleChildren.length > 0) acc.push({ ...item, children: visibleChildren });
        return acc;
      }

      // Tenant registry + global tenant settings are Super Admin only.
      if (GLOBAL_TENANT_SETTING_KEYS.includes(item.key) && role.id !== SUPER_ADMIN_ROLE_ID) return acc;
      if (can(role, item.key, "view")) acc.push(item);
      return acc;
    }, []);
  }

  return filterItems(MENU_ITEMS);
}

export function roleHomePath(roleDef: RoleDef): string {
  return `/${roleDef.slug}/dashboard`;
}

/** All leaf ModuleKeys — used when seeding full-access roles. */
export function allLeafModuleKeys(): ModuleKey[] {
  return flatMenuItems().map((item) => item.key);
}
