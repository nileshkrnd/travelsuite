import type { RoleDef } from "@/types";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export type ModuleKey =
  | "dashboard"
  // Administration
  | "administration"
  | "company"
  | "adminCompany"
  | "branch"
  | "branchType"
  | "adminProduct"
  | "adminServiceProduct"
  | "serviceType"
  | "serviceProductClassification"
  | "serviceProductCategory"
  | "durationUnit"
  | "bookingModel"
  | "pricingModel"
  | "serviceTypeConfiguration"
  | "adminConfiguration"
  | "commonStatusType"
  | "commonStatus"
  | "property"
  | "propertySupplier"
  | "ratePlanType"
  | "mealPlan"
  | "rateBasis"
  | "tax"
  | "adminMasters"
  | "department"
  | "designation"
  | "employee"
  | "employeePropertyAccess"
  | "adminEmployees"
  | "employeeGdsSign"
  | "exchangeRate"
  | "adminCustomers"
  | "cashCustomer"
  | "adminSuppliers"
  | "creditControl"
  | "roles"
  | "accessRole"
  | "permissions"
  | "users"
  | "approvalMatrix"
  | "holidays"
  | "mastersHub"
  | "tenantProfile"
  | "globalTenantSettings"
  | "geography"
  | "country"
  | "state"
  | "stateAdministrativeType"
  | "city"
  | "area"
  | "areaType"
  | "location"
  | "locationType"
  | "region"
  | "currency"
  | "culture"
  | "aviation"
  | "airlineType"
  | "airline"
  | "airport"
  | "propertyMasters"
  | "propertyType"
  | "propertyCategory"
  | "propertyUsage"
  | "ownershipType"
  | "propertyBrand"
  | "supplierType"
  | "amenityMasters"
  | "amenityFacilityCategory"
  | "amenity"
  | "facility"
  | "roomMasters"
  | "roomCategory"
  | "roomType"
  | "bedType"
  | "smokingType"
  | "viewType"
  | "subscription"
  | "subscriptionProduct"
  | "subscriptionModule"
  | "subscriptionModuleAccess"
  | "subscriptionModuleMenu"
  | "product"
  | "partners"
  | "agency"
  | "subAgency"
  | "corporateAccounts"
  | "supplier"
  | "supplierUser"
  | "supplierPropertyAccess"
  // HRMS
  | "hrms"
  | "hrmsDashboard"
  | "hrmsEmployees"
  | "hrmsMasters"
  | "hrmsMasterDepartment"
  | "hrmsMasterDesignation"
  | "hrmsMasterEmployee"
  | "adminHrMasters"
  | "hrmsGrade"
  | "hrmsShift"
  | "hrmsLeaveType"
  | "hrmsHolidayCalendar"
  | "hrmsSalaryComponent"
  | "hrmsDocumentType"
  | "hrmsAttendance"
  | "attendanceDaily"
  | "attendanceRoster"
  | "attendanceRegularization"
  | "hrmsLeave"
  | "leaveRequests"
  | "leaveBalance"
  | "leavePolicy"
  | "hrmsPayroll"
  | "payrollStructure"
  | "payrollRun"
  | "payrollLoans"
  | "hrmsRecruitment"
  | "recruitmentJobs"
  | "recruitmentCandidates"
  | "recruitmentInterviews"
  | "hrmsPerformance"
  | "performanceGoals"
  | "performanceAppraisals"
  | "hrmsDocuments"
  | "letters"
  | "employeeDocuments"
  | "hrmsExit"
  | "resignation"
  | "gratuity"
  | "settlement"
  // Legacy flat HRMS keys (kept for older role payloads / redirects)
  | "attendance"
  | "leave"
  | "payroll"
  | "recruitment"
  | "performance"
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
  | "extranetSelectProperty"
  | "contracts"
  | "seasons"
  | "propertyRooms"
  | "rates"
  | "extranetInventory"
  | "supplement"
  | "childPolicies"
  | "cancellationPolicies"
  | "marketRules"
  | "contractTaxes"
  | "extranetAvailability"
  | "promotions"
  | "stopSales"
  | "blackoutDates"
  | "extranetConnectivity"
  | "extranetReviews"
  | "extranetBookings"
  | "extranetReports"
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
  | "inventoryMasters"
  | "warehouse"
  | "products"
  | "inventoryCategory"
  | "inventoryUom"
  | "inventoryPurchasing"
  | "purchaseOrders"
  | "inventoryStockOps"
  | "stockIn"
  | "stockOut"
  | "stockTransfers"
  | "stockAdjustment"
  | "stockTake"
  | "inventoryReports"
  | "stockOnHand"
  | "stockLedger"
  | "lowStock"
  // Procurement
  | "procurement"
  | "procurementDashboard"
  | "purchaseRequisitions"
  | "rfq"
  | "procurementOrders"
  | "vendors"
  | "goodsReceipt"
  | "vendorInvoices"
  | "procurementContracts"
  | "procurementReports"
  // Accounts / Finance
  | "accounts"
  | "accountsDashboard"
  | "accountsSetup"
  | "accountGroup"
  | "ledger"
  | "chartOfAccounts"
  | "fiscalYearPeriod"
  | "vouchers"
  | "voucherJournal"
  | "voucherSales"
  | "voucherPurchase"
  | "voucherContra"
  | "voucherReceipt"
  | "voucherPayment"
  | "voucherCreditNote"
  | "voucherDebitNote"
  | "invoices"
  | "receivablesPayables"
  | "customerOutstanding"
  | "vendorOutstanding"
  | "ageingAr"
  | "ageingAp"
  | "financeBank"
  | "financeBankAccounts"
  | "bankReconciliation"
  | "financeSupplier"
  | "supplierReconciliation"
  | "companyReports"
  | "accountsReports"
  | "reportBalanceSheet"
  | "reportProfitAndLoss"
  | "reportTrialBalance"
  | "generalLedgerReport"
  | "voucherRegister"
  | "groupConsolidatedReports"
  | "consolidatedTrialBalance"
  | "consolidatedProfitAndLoss"
  | "consolidatedBalanceSheet"
  | "companyComparison"
  | "periodClose"
  | "periodLock"
  | "yearEndClose"
  // CRM
  | "crm"
  | "crmDashboard"
  | "crmLeads"
  | "opportunities"
  | "crmCustomers"
  | "campaigns"
  | "supportTickets"
  // Helpdesk
  | "helpdesk"
  | "helpdeskDashboard"
  | "helpdeskTickets"
  | "helpdeskTicketsAll"
  | "helpdeskTicketsOpen"
  | "helpdeskTicketsPending"
  | "helpdeskTicketsResolved"
  | "helpdeskTicketsClosed"
  | "helpdeskEmail"
  | "helpdeskWhatsApp"
  | "helpdeskConversations"
  | "helpdeskSla"
  | "helpdeskAutomation"
  | "helpdeskCannedResponses"
  | "helpdeskTemplates"
  | "helpdeskKnowledgeBase"
  | "helpdeskReports"
  | "helpdeskChannels"
  | "helpdeskMailboxes"
  | "helpdeskChannelsWhatsApp"
  | "helpdeskChannelsWebChat"
  | "helpdeskChannelsSms"
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
  key: ModuleKey | string;
  labelKey: string;
  /** When set (e.g. DB-driven menus), shown instead of translating `key`. */
  label?: string;
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
  "geography",
  "country",
  "state",
  "stateAdministrativeType",
  "city",
  "area",
  "areaType",
  "location",
  "locationType",
  "region",
  "currency",
  "culture",
  "aviation",
  "airlineType",
  "airline",
  "airport",
  "propertyMasters",
  "propertyType",
  "propertyCategory",
  "propertyUsage",
  "ownershipType",
  "propertyBrand",
  "supplierType",
  "amenityMasters",
  "amenityFacilityCategory",
  "amenity",
  "facility",
  "roomMasters",
  "roomCategory",
  "roomType",
  "bedType",
  "smokingType",
  "viewType",
  "subscription",
  "subscriptionProduct",
  "subscriptionModule",
  "subscriptionModuleAccess",
  "subscriptionModuleMenu",
  "users",
];

/** Menu keys visible when Super Admin is in platform mode (no specific tenant). */
const PLATFORM_MODE_MENU_KEYS = new Set<ModuleKey>([
  "dashboard",
  "globalTenantSettings",
  ...GLOBAL_TENANT_SETTING_KEYS,
  "accessRole",
  "property",
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
      {
        key: "geography",
        labelKey: "sidebar.geography",
        icon: "Globe",
        path: "masters/geography",
        children: [
          { key: "country", labelKey: "sidebar.country", icon: "Globe", path: "masters/country" },
          { key: "state", labelKey: "sidebar.state", icon: "MapPin", path: "masters/state" },
          {
            key: "stateAdministrativeType",
            labelKey: "sidebar.stateAdministrativeType",
            icon: "ListTree",
            path: "masters/state-administrative-type",
          },
          { key: "city", labelKey: "sidebar.city", icon: "MapPinned", path: "masters/city" },
          { key: "area", labelKey: "sidebar.area", icon: "LandPlot", path: "masters/area" },
          { key: "areaType", labelKey: "sidebar.areaType", icon: "LandPlot", path: "masters/area-type" },
          { key: "location", labelKey: "sidebar.location", icon: "Pin", path: "masters/location" },
          {
            key: "locationType",
            labelKey: "sidebar.locationType",
            icon: "Pin",
            path: "masters/location-type",
          },
          { key: "region", labelKey: "sidebar.region", icon: "Landmark", path: "masters/region" },
        ],
      },
      { key: "currency", labelKey: "sidebar.currency", icon: "Coins", path: "masters/currency" },
      { key: "culture", labelKey: "sidebar.culture", icon: "Globe2", path: "masters/culture" },
      { key: "supplierType", labelKey: "sidebar.supplierType", icon: "Store", path: "masters/supplier-type" },
      {
        key: "amenityMasters",
        labelKey: "sidebar.amenityMasters",
        icon: "Sparkles",
        path: "masters/amenities",
        children: [
          {
            key: "amenityFacilityCategory",
            labelKey: "sidebar.amenityFacilityCategory",
            icon: "Tags",
            path: "masters/amenity-facility-category",
          },
          {
            key: "amenity",
            labelKey: "sidebar.amenity",
            icon: "Sparkles",
            path: "masters/amenity",
          },
          {
            key: "facility",
            labelKey: "sidebar.facility",
            icon: "Wrench",
            path: "masters/facility",
          },
        ],
      },
      {
        key: "roomMasters",
        labelKey: "sidebar.roomMasters",
        icon: "BedDouble",
        path: "masters/rooms",
        children: [
          {
            key: "roomCategory",
            labelKey: "sidebar.roomCategory",
            icon: "Layers",
            path: "masters/room-category",
          },
          {
            key: "roomType",
            labelKey: "sidebar.roomType",
            icon: "Home",
            path: "masters/room-type",
          },
          {
            key: "bedType",
            labelKey: "sidebar.bedType",
            icon: "BedDouble",
            path: "masters/bed-type",
          },
          {
            key: "smokingType",
            labelKey: "sidebar.smokingType",
            icon: "Ban",
            path: "masters/smoking-type",
          },
          {
            key: "viewType",
            labelKey: "sidebar.viewType",
            icon: "Eye",
            path: "masters/view-type",
          },
        ],
      },
      {
        key: "aviation",
        labelKey: "sidebar.aviation",
        icon: "Plane",
        path: "masters/aviation",
        children: [
          { key: "airlineType", labelKey: "sidebar.airlineType", icon: "Tags", path: "masters/airline-type" },
          { key: "airline", labelKey: "sidebar.airline", icon: "Plane", path: "masters/airline" },
          { key: "airport", labelKey: "sidebar.airport", icon: "MapPinned", path: "masters/airport" },
        ],
      },
      {
        key: "propertyMasters",
        labelKey: "sidebar.propertyMasters",
        icon: "Tags",
        path: "masters/property-masters",
        children: [
          {
            key: "property",
            labelKey: "sidebar.property",
            icon: "Building",
            path: "masters/property",
          },
          {
            key: "propertyType",
            labelKey: "sidebar.propertyType",
            icon: "Building2",
            path: "masters/property-type",
          },
          {
            key: "propertyCategory",
            labelKey: "sidebar.propertyCategory",
            icon: "Tags",
            path: "masters/property-category",
          },
          {
            key: "propertyUsage",
            labelKey: "sidebar.propertyUsage",
            icon: "KeyRound",
            path: "masters/property-usage",
          },
          {
            key: "ownershipType",
            labelKey: "sidebar.ownershipType",
            icon: "Landmark",
            path: "masters/ownership-type",
          },
          {
            key: "propertyBrand",
            labelKey: "sidebar.propertyBrand",
            icon: "Award",
            path: "masters/property-brand",
          },
        ],
      },
      {
        key: "subscription",
        labelKey: "sidebar.subscription",
        icon: "Package",
        path: "masters/subscription",
        children: [
          {
            key: "subscriptionProduct",
            labelKey: "sidebar.subscriptionProduct",
            icon: "Package",
            path: "masters/subscription-product",
          },
          {
            key: "subscriptionModule",
            labelKey: "sidebar.subscriptionModule",
            icon: "Layers",
            path: "masters/subscription-module",
          },
          {
            key: "subscriptionModuleAccess",
            labelKey: "sidebar.subscriptionModuleAccess",
            icon: "KeyRound",
            path: "masters/subscription-module-access",
          },
          {
            key: "subscriptionModuleMenu",
            labelKey: "sidebar.subscriptionModuleMenu",
            icon: "ListTree",
            path: "masters/subscription-module-menu",
          },
        ],
      },
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
      {
        key: "adminCompany",
        labelKey: "sidebar.adminCompany",
        icon: "Building2",
        path: "administration/company",
        children: [
          { key: "company", labelKey: "sidebar.company", icon: "Building2", path: "masters/company" },
          { key: "branch", labelKey: "sidebar.branch", icon: "GitBranch", path: "masters/branch" },
          { key: "branchType", labelKey: "sidebar.branchType", icon: "ListTree", path: "masters/branch-type" },
        ],
      },
      {
        key: "adminMasters",
        labelKey: "sidebar.adminMasters",
        icon: "Layers",
        path: "administration/masters",
        children: [
          { key: "department", labelKey: "sidebar.department", icon: "Network", path: "masters/department" },
          { key: "designation", labelKey: "sidebar.designation", icon: "Briefcase", path: "masters/designation" },
          { key: "accessRole", labelKey: "sidebar.accessRole", icon: "KeyRound", path: "masters/access-role" },
          {
            key: "permissions",
            labelKey: "sidebar.permissions",
            icon: "Lock",
            path: "administration/permissions",
          },
        ],
      },
      {
        key: "adminHrMasters",
        labelKey: "sidebar.adminHrMasters",
        icon: "Users",
        path: "administration/hr-masters",
        children: [
          {
            key: "hrmsGrade",
            labelKey: "sidebar.hrmsGrade",
            icon: "Tags",
            path: "administration/hr-masters/grade",
          },
          {
            key: "hrmsShift",
            labelKey: "sidebar.hrmsShift",
            icon: "Clock",
            path: "administration/hr-masters/shift",
          },
          {
            key: "hrmsLeaveType",
            labelKey: "sidebar.hrmsLeaveType",
            icon: "PalmTree",
            path: "administration/hr-masters/leave-type",
          },
          {
            key: "hrmsHolidayCalendar",
            labelKey: "sidebar.hrmsHolidayCalendar",
            icon: "CalendarDays",
            path: "administration/hr-masters/holiday-calendar",
          },
          {
            key: "hrmsSalaryComponent",
            labelKey: "sidebar.hrmsSalaryComponent",
            icon: "BadgeDollarSign",
            path: "administration/hr-masters/salary-component",
          },
          {
            key: "hrmsDocumentType",
            labelKey: "sidebar.hrmsDocumentType",
            icon: "FileBadge",
            path: "administration/hr-masters/document-type",
          },
        ],
      },
      {
        key: "exchangeRate",
        labelKey: "sidebar.exchangeRate",
        icon: "ArrowLeftRight",
        path: "administration/exchange-rate",
      },
      {
        key: "adminEmployees",
        labelKey: "sidebar.adminEmployees",
        icon: "UserCog",
        path: "administration/employees",
        children: [
          { key: "employee", labelKey: "sidebar.employee", icon: "UserCog", path: "masters/employee" },
          {
            key: "employeePropertyAccess",
            labelKey: "sidebar.employeePropertyAccess",
            icon: "ShieldCheck",
            path: "masters/employee-property-access",
          },
          {
            key: "employeeGdsSign",
            labelKey: "sidebar.employeeGdsSign",
            icon: "KeyRound",
            path: "administration/employee-gds-sign",
          },
        ],
      },
      {
        key: "adminCustomers",
        labelKey: "sidebar.adminCustomers",
        icon: "Users2",
        path: "administration/customers",
        children: [
          {
            key: "cashCustomer",
            labelKey: "sidebar.cashCustomer",
            icon: "Wallet",
            path: "administration/customers/cash",
          },
          {
            key: "corporateAccounts",
            labelKey: "sidebar.corporateCustomer",
            icon: "Landmark",
            path: "masters/corporateAccounts",
          },
          {
            key: "subAgency",
            labelKey: "sidebar.subAgent",
            icon: "GitFork",
            path: "masters/subAgency",
          },
        ],
      },
      {
        key: "adminSuppliers",
        labelKey: "sidebar.adminSuppliers",
        icon: "Store",
        path: "administration/suppliers",
        children: [
          { key: "supplier", labelKey: "sidebar.supplier", icon: "Store", path: "masters/supplier" },
          {
            key: "supplierUser",
            labelKey: "sidebar.supplierUser",
            icon: "UserPlus",
            path: "masters/supplier-user",
          },
          {
            key: "supplierPropertyAccess",
            labelKey: "sidebar.supplierPropertyAccess",
            icon: "ShieldCheck",
            path: "masters/supplier-property-access",
          },
        ],
      },
      {
        key: "creditControl",
        labelKey: "sidebar.creditControl",
        icon: "CreditCard",
        path: "administration/credit-control",
      },
      {
        key: "adminProduct",
        labelKey: "sidebar.propertyGroup",
        icon: "Building",
        path: "administration/property",
        children: [
          {
            key: "property",
            labelKey: "sidebar.property",
            icon: "Building",
            path: "masters/property",
          },
          {
            key: "propertySupplier",
            labelKey: "sidebar.propertySupplier",
            icon: "Store",
            path: "masters/property-supplier",
          },
          {
            key: "ratePlanType",
            labelKey: "sidebar.ratePlanType",
            icon: "Tags",
            path: "masters/rate-plan-type",
          },
          {
            key: "mealPlan",
            labelKey: "sidebar.mealPlan",
            icon: "UtensilsCrossed",
            path: "masters/meal-plan",
          },
          {
            key: "rateBasis",
            labelKey: "sidebar.rateBasis",
            icon: "Scale",
            path: "masters/rate-basis",
          },
          {
            key: "tax",
            labelKey: "sidebar.tax",
            icon: "Landmark",
            path: "masters/tax",
          },
        ],
      },
      {
        key: "adminServiceProduct",
        labelKey: "sidebar.adminServiceProduct",
        icon: "Package",
        path: "administration/service-product",
        children: [
          {
            key: "serviceType",
            labelKey: "sidebar.serviceType",
            icon: "Tags",
            path: "masters/service-type",
          },
          {
            key: "serviceProductClassification",
            labelKey: "sidebar.serviceProductClassification",
            icon: "ListTree",
            path: "masters/service-product-classification",
          },
          {
            key: "serviceProductCategory",
            labelKey: "sidebar.serviceProductCategory",
            icon: "LayoutGrid",
            path: "masters/service-product-category",
          },
          {
            key: "durationUnit",
            labelKey: "sidebar.durationUnit",
            icon: "Clock",
            path: "masters/duration-unit",
          },
          {
            key: "bookingModel",
            labelKey: "sidebar.bookingModel",
            icon: "BookMarked",
            path: "masters/booking-model",
          },
          {
            key: "pricingModel",
            labelKey: "sidebar.pricingModel",
            icon: "Coins",
            path: "masters/pricing-model",
          },
          {
            key: "serviceTypeConfiguration",
            labelKey: "sidebar.serviceTypeConfiguration",
            icon: "Settings",
            path: "masters/service-type-configuration",
          },
        ],
      },
      {
        key: "adminConfiguration",
        labelKey: "sidebar.adminConfiguration",
        icon: "Workflow",
        path: "administration/configuration",
        children: [
          {
            key: "commonStatusType",
            labelKey: "sidebar.commonStatusType",
            icon: "Workflow",
            path: "masters/common-status-type",
          },
          {
            key: "commonStatus",
            labelKey: "sidebar.commonStatus",
            icon: "ListOrdered",
            path: "masters/common-status",
          },
        ],
      },
    ],
  },
  {
    key: "hrms",
    labelKey: "sidebar.hrms",
    icon: "Users",
    path: "hrms",
    children: [
      { key: "hrmsDashboard", labelKey: "sidebar.hrmsDashboard", icon: "LayoutDashboard", path: "hrms/dashboard" },
      { key: "hrmsEmployees", labelKey: "sidebar.hrmsEmployees", icon: "Users2", path: "hrms/employees" },
      {
        key: "hrmsAttendance",
        labelKey: "sidebar.hrmsAttendance",
        icon: "Clock",
        path: "hrms/attendance",
        children: [
          {
            key: "attendanceDaily",
            labelKey: "sidebar.attendanceDaily",
            icon: "CalendarCheck",
            path: "hrms/attendance/daily",
          },
          {
            key: "attendanceRoster",
            labelKey: "sidebar.attendanceRoster",
            icon: "ListOrdered",
            path: "hrms/attendance/roster",
          },
          {
            key: "attendanceRegularization",
            labelKey: "sidebar.attendanceRegularization",
            icon: "RefreshCw",
            path: "hrms/attendance/regularization",
          },
        ],
      },
      {
        key: "hrmsLeave",
        labelKey: "sidebar.hrmsLeave",
        icon: "PalmTree",
        path: "hrms/leave",
        children: [
          {
            key: "leaveRequests",
            labelKey: "sidebar.leaveRequests",
            icon: "FilePlus",
            path: "hrms/leave/requests",
          },
          {
            key: "leaveBalance",
            labelKey: "sidebar.leaveBalance",
            icon: "Scale",
            path: "hrms/leave/balance",
          },
          {
            key: "leavePolicy",
            labelKey: "sidebar.leavePolicy",
            icon: "ClipboardCheck",
            path: "hrms/leave/policy",
          },
        ],
      },
      {
        key: "hrmsPayroll",
        labelKey: "sidebar.hrmsPayroll",
        icon: "Wallet",
        path: "hrms/payroll",
        children: [
          {
            key: "payrollStructure",
            labelKey: "sidebar.payrollStructure",
            icon: "Layers",
            path: "hrms/payroll/structure",
          },
          {
            key: "payrollRun",
            labelKey: "sidebar.payrollRun",
            icon: "Receipt",
            path: "hrms/payroll/run",
          },
          {
            key: "payrollLoans",
            labelKey: "sidebar.payrollLoans",
            icon: "CreditCard",
            path: "hrms/payroll/loans",
          },
        ],
      },
      {
        key: "hrmsRecruitment",
        labelKey: "sidebar.hrmsRecruitment",
        icon: "UserPlus",
        path: "hrms/recruitment",
        children: [
          {
            key: "recruitmentJobs",
            labelKey: "sidebar.recruitmentJobs",
            icon: "Briefcase",
            path: "hrms/recruitment/jobs",
          },
          {
            key: "recruitmentCandidates",
            labelKey: "sidebar.recruitmentCandidates",
            icon: "UserCheck",
            path: "hrms/recruitment/candidates",
          },
          {
            key: "recruitmentInterviews",
            labelKey: "sidebar.recruitmentInterviews",
            icon: "Users",
            path: "hrms/recruitment/interviews",
          },
        ],
      },
      {
        key: "hrmsPerformance",
        labelKey: "sidebar.hrmsPerformance",
        icon: "TrendingUp",
        path: "hrms/performance",
        children: [
          {
            key: "performanceGoals",
            labelKey: "sidebar.performanceGoals",
            icon: "Target",
            path: "hrms/performance/goals",
          },
          {
            key: "performanceAppraisals",
            labelKey: "sidebar.performanceAppraisals",
            icon: "ClipboardCheck",
            path: "hrms/performance/appraisals",
          },
        ],
      },
      {
        key: "hrmsDocuments",
        labelKey: "sidebar.hrmsDocuments",
        icon: "FileText",
        path: "hrms/documents",
        children: [
          { key: "letters", labelKey: "sidebar.letters", icon: "FileSignature", path: "hrms/documents/letters" },
          {
            key: "employeeDocuments",
            labelKey: "sidebar.employeeDocuments",
            icon: "FileBadge",
            path: "hrms/documents/employee-documents",
          },
        ],
      },
      {
        key: "hrmsExit",
        labelKey: "sidebar.hrmsExit",
        icon: "LogOut",
        path: "hrms/exit",
        children: [
          {
            key: "resignation",
            labelKey: "sidebar.resignation",
            icon: "FileText",
            path: "hrms/exit/resignation",
          },
          { key: "gratuity", labelKey: "sidebar.gratuity", icon: "Gift", path: "hrms/exit/gratuity" },
          {
            key: "settlement",
            labelKey: "sidebar.settlement",
            icon: "Scale",
            path: "hrms/exit/settlement",
          },
        ],
      },
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
      { key: "extranetSelectProperty", labelKey: "sidebar.extranetSelectProperty", icon: "Building2", path: "extranet/select-property" },
      { key: "extranetAvailability", labelKey: "sidebar.extranetAvailability", icon: "CalendarCheck", path: "extranet/availability" },
      { key: "seasons", labelKey: "sidebar.seasons", icon: "CalendarRange", path: "extranet/seasons" },
      { key: "propertyRooms", labelKey: "sidebar.propertyRooms", icon: "BedDouble", path: "extranet/rooms" },
      { key: "contracts", labelKey: "sidebar.contracts", icon: "FileSignature", path: "extranet/contracts" },
      { key: "rates", labelKey: "sidebar.rates", icon: "BadgeDollarSign", path: "extranet/rates" },
      { key: "extranetInventory", labelKey: "sidebar.extranetInventory", icon: "Boxes", path: "extranet/inventory" },
      { key: "supplement", labelKey: "sidebar.supplement", icon: "PlusCircle", path: "extranet/supplement" },
      { key: "childPolicies", labelKey: "sidebar.childPolicies", icon: "Baby", path: "extranet/child-policies" },
      { key: "cancellationPolicies", labelKey: "sidebar.cancellationPolicies", icon: "Undo2", path: "extranet/cancellation-policies" },
      { key: "marketRules", labelKey: "sidebar.marketRules", icon: "Globe", path: "extranet/market-rules" },
      { key: "contractTaxes", labelKey: "sidebar.contractTaxes", icon: "Landmark", path: "extranet/taxes" },
      { key: "promotions", labelKey: "sidebar.promotions", icon: "Megaphone", path: "extranet/promotions" },
      { key: "stopSales", labelKey: "sidebar.stopSales", icon: "Ban", path: "extranet/stop-sales" },
      { key: "blackoutDates", labelKey: "sidebar.blackoutDates", icon: "CalendarOff", path: "extranet/blackout-dates" },
      { key: "extranetBookings", labelKey: "sidebar.extranetBookings", icon: "CalendarDays", path: "extranet/bookings" },
      { key: "extranetReports", labelKey: "sidebar.extranetReports", icon: "BarChart3", path: "extranet/reports" },
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
      {
        key: "inventoryDashboard",
        labelKey: "sidebar.inventoryDashboard",
        icon: "LayoutDashboard",
        path: "inventory/dashboard",
      },
      {
        key: "inventoryMasters",
        labelKey: "sidebar.inventoryMasters",
        icon: "Layers",
        path: "inventory/masters",
        children: [
          {
            key: "warehouse",
            labelKey: "sidebar.warehouse",
            icon: "Warehouse",
            path: "inventory/masters/warehouse",
          },
          {
            key: "products",
            labelKey: "sidebar.products",
            icon: "Package",
            path: "inventory/masters/items",
          },
          {
            key: "inventoryCategory",
            labelKey: "sidebar.inventoryCategory",
            icon: "Tags",
            path: "inventory/masters/category",
          },
          {
            key: "inventoryUom",
            labelKey: "sidebar.inventoryUom",
            icon: "ListOrdered",
            path: "inventory/masters/uom",
          },
        ],
      },
      {
        key: "inventoryPurchasing",
        labelKey: "sidebar.inventoryPurchasing",
        icon: "ShoppingCart",
        path: "inventory/purchasing",
        children: [
          {
            key: "purchaseOrders",
            labelKey: "sidebar.purchaseOrders",
            icon: "ShoppingCart",
            path: "inventory/purchasing/purchase-orders",
          },
        ],
      },
      {
        key: "inventoryStockOps",
        labelKey: "sidebar.inventoryStockOps",
        icon: "Boxes",
        path: "inventory/stock",
        children: [
          {
            key: "stockIn",
            labelKey: "sidebar.stockIn",
            icon: "ArrowDownToLine",
            path: "inventory/stock/stock-in",
          },
          {
            key: "stockOut",
            labelKey: "sidebar.stockOut",
            icon: "ArrowUpFromLine",
            path: "inventory/stock/stock-out",
          },
          {
            key: "stockTransfers",
            labelKey: "sidebar.stockTransfers",
            icon: "ArrowLeftRight",
            path: "inventory/stock/transfers",
          },
          {
            key: "stockAdjustment",
            labelKey: "sidebar.stockAdjustment",
            icon: "RefreshCw",
            path: "inventory/stock/adjustment",
          },
          {
            key: "stockTake",
            labelKey: "sidebar.stockTake",
            icon: "ClipboardCheck",
            path: "inventory/stock/stock-take",
          },
        ],
      },
      {
        key: "inventoryReports",
        labelKey: "sidebar.inventoryReports",
        icon: "BarChart3",
        path: "inventory/reports",
        children: [
          {
            key: "stockOnHand",
            labelKey: "sidebar.stockOnHand",
            icon: "Package",
            path: "inventory/reports/stock-on-hand",
          },
          {
            key: "stockLedger",
            labelKey: "sidebar.stockLedger",
            icon: "BookMarked",
            path: "inventory/reports/stock-ledger",
          },
          {
            key: "lowStock",
            labelKey: "sidebar.lowStock",
            icon: "Hourglass",
            path: "inventory/reports/low-stock",
          },
        ],
      },
    ],
  },
  {
    key: "procurement",
    labelKey: "sidebar.procurement",
    icon: "ShoppingCart",
    path: "procurement",
    children: [
      { key: "procurementDashboard", labelKey: "sidebar.procurementDashboard", icon: "LayoutDashboard", path: "procurement/dashboard" },
      { key: "purchaseRequisitions", labelKey: "sidebar.purchaseRequisitions", icon: "ClipboardCheck", path: "procurement/requisitions" },
      { key: "rfq", labelKey: "sidebar.rfq", icon: "FileSignature", path: "procurement/rfq" },
      { key: "procurementOrders", labelKey: "sidebar.procurementOrders", icon: "ShoppingCart", path: "procurement/purchase-orders" },
      { key: "vendors", labelKey: "sidebar.vendors", icon: "Store", path: "procurement/vendors" },
      { key: "goodsReceipt", labelKey: "sidebar.goodsReceipt", icon: "ArrowDownToLine", path: "procurement/goods-receipt" },
      { key: "vendorInvoices", labelKey: "sidebar.vendorInvoices", icon: "Receipt", path: "procurement/vendor-invoices" },
      { key: "procurementContracts", labelKey: "sidebar.procurementContracts", icon: "FileText", path: "procurement/contracts" },
      { key: "procurementReports", labelKey: "sidebar.procurementReports", icon: "BarChart3", path: "procurement/reports" },
    ],
  },
  {
    key: "accounts",
    labelKey: "sidebar.accounts",
    icon: "Landmark",
    path: "accounts",
    children: [
      {
        key: "accountsDashboard",
        labelKey: "sidebar.accountsDashboard",
        icon: "LayoutDashboard",
        path: "accounts/dashboard",
      },
      {
        key: "accountsSetup",
        labelKey: "sidebar.accountsSetup",
        icon: "Settings",
        path: "accounts/setup",
        children: [
          { key: "accountGroup", labelKey: "sidebar.accountGroup", icon: "ListTree", path: "accounts/group" },
          {
            key: "chartOfAccounts",
            labelKey: "sidebar.chartOfAccounts",
            icon: "BookOpen",
            path: "accounts/chart-of-accounts",
          },
          { key: "ledger", labelKey: "sidebar.ledger", icon: "BookMarked", path: "accounts/ledger" },
          {
            key: "fiscalYearPeriod",
            labelKey: "sidebar.fiscalYearPeriod",
            icon: "CalendarDays",
            path: "accounts/setup/fiscal-year",
          },
        ],
      },
      {
        key: "vouchers",
        labelKey: "sidebar.vouchers",
        icon: "ScrollText",
        path: "accounts/vouchers",
        children: [
          { key: "voucherJournal", labelKey: "sidebar.voucherJournal", icon: "FileSignature", path: "accounts/vouchers/journal" },
          { key: "voucherSales", labelKey: "sidebar.voucherSales", icon: "ShoppingBag", path: "accounts/vouchers/sales" },
          { key: "voucherPurchase", labelKey: "sidebar.voucherPurchase", icon: "ShoppingCart", path: "accounts/vouchers/purchase" },
          { key: "voucherContra", labelKey: "sidebar.voucherContra", icon: "ArrowLeftRight", path: "accounts/vouchers/contra" },
          { key: "voucherReceipt", labelKey: "sidebar.voucherReceipt", icon: "Receipt", path: "accounts/vouchers/receipt" },
          { key: "voucherPayment", labelKey: "sidebar.voucherPayment", icon: "CreditCard", path: "accounts/vouchers/payment" },
          { key: "voucherCreditNote", labelKey: "sidebar.voucherCreditNote", icon: "FilePlus", path: "accounts/vouchers/credit-note" },
          { key: "voucherDebitNote", labelKey: "sidebar.voucherDebitNote", icon: "FileText", path: "accounts/vouchers/debit-note" },
        ],
      },
      {
        key: "receivablesPayables",
        labelKey: "sidebar.receivablesPayables",
        icon: "BadgeDollarSign",
        path: "accounts/receivables-payables",
        children: [
          {
            key: "customerOutstanding",
            labelKey: "sidebar.customerOutstanding",
            icon: "Users",
            path: "accounts/receivables-payables/customer-outstanding",
          },
          {
            key: "vendorOutstanding",
            labelKey: "sidebar.vendorOutstanding",
            icon: "Store",
            path: "accounts/receivables-payables/vendor-outstanding",
          },
          {
            key: "ageingAr",
            labelKey: "sidebar.ageingAr",
            icon: "Hourglass",
            path: "accounts/receivables-payables/ageing-ar",
          },
          {
            key: "ageingAp",
            labelKey: "sidebar.ageingAp",
            icon: "Hourglass",
            path: "accounts/receivables-payables/ageing-ap",
          },
        ],
      },
      {
        key: "financeBank",
        labelKey: "sidebar.financeBank",
        icon: "Landmark",
        path: "accounts/bank",
        children: [
          {
            key: "financeBankAccounts",
            labelKey: "sidebar.financeBankAccounts",
            icon: "Wallet",
            path: "accounts/bank/accounts",
          },
          {
            key: "bankReconciliation",
            labelKey: "sidebar.bankReconciliation",
            icon: "ArrowLeftRight",
            path: "accounts/bank/reconciliation",
          },
        ],
      },
      {
        key: "financeSupplier",
        labelKey: "sidebar.financeSupplier",
        icon: "Store",
        path: "accounts/supplier",
        children: [
          {
            key: "supplierReconciliation",
            labelKey: "sidebar.supplierReconciliation",
            icon: "ArrowLeftRight",
            path: "accounts/supplier/reconciliation",
          },
        ],
      },
      {
        key: "companyReports",
        labelKey: "sidebar.companyReports",
        icon: "BarChart3",
        path: "accounts/company-reports",
        children: [
          {
            key: "reportTrialBalance",
            labelKey: "sidebar.reportTrialBalance",
            icon: "FileSpreadsheet",
            path: "accounts/reports/trial-balance",
          },
          {
            key: "reportProfitAndLoss",
            labelKey: "sidebar.reportProfitAndLoss",
            icon: "TrendingUp",
            path: "accounts/reports/profit-and-loss",
          },
          {
            key: "reportBalanceSheet",
            labelKey: "sidebar.reportBalanceSheet",
            icon: "Scale",
            path: "accounts/reports/balance-sheet",
          },
          {
            key: "generalLedgerReport",
            labelKey: "sidebar.generalLedgerReport",
            icon: "BookOpen",
            path: "accounts/company-reports/general-ledger",
          },
          {
            key: "voucherRegister",
            labelKey: "sidebar.voucherRegister",
            icon: "ScrollText",
            path: "accounts/company-reports/voucher-register",
          },
        ],
      },
      {
        key: "groupConsolidatedReports",
        labelKey: "sidebar.groupConsolidatedReports",
        icon: "Building2",
        path: "accounts/group-reports",
        children: [
          {
            key: "consolidatedTrialBalance",
            labelKey: "sidebar.consolidatedTrialBalance",
            icon: "FileSpreadsheet",
            path: "accounts/group-reports/trial-balance",
          },
          {
            key: "consolidatedProfitAndLoss",
            labelKey: "sidebar.consolidatedProfitAndLoss",
            icon: "TrendingUp",
            path: "accounts/group-reports/profit-and-loss",
          },
          {
            key: "consolidatedBalanceSheet",
            labelKey: "sidebar.consolidatedBalanceSheet",
            icon: "Scale",
            path: "accounts/group-reports/balance-sheet",
          },
          {
            key: "companyComparison",
            labelKey: "sidebar.companyComparison",
            icon: "GitBranch",
            path: "accounts/group-reports/company-comparison",
          },
        ],
      },
      {
        key: "periodClose",
        labelKey: "sidebar.periodClose",
        icon: "Lock",
        path: "accounts/period-close",
        children: [
          {
            key: "periodLock",
            labelKey: "sidebar.periodLock",
            icon: "Lock",
            path: "accounts/period-close/period-lock",
          },
          {
            key: "yearEndClose",
            labelKey: "sidebar.yearEndClose",
            icon: "CalendarDays",
            path: "accounts/period-close/year-end",
          },
        ],
      },
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
    key: "helpdesk",
    labelKey: "sidebar.helpdesk",
    icon: "Headphones",
    path: "helpdesk/dashboard",
    children: [
      {
        key: "helpdeskDashboard",
        labelKey: "sidebar.helpdeskDashboard",
        icon: "LayoutDashboard",
        path: "helpdesk/dashboard",
      },
      {
        key: "helpdeskTickets",
        labelKey: "sidebar.helpdeskTickets",
        icon: "Ticket",
        path: "helpdesk/tickets",
        children: [
          {
            key: "helpdeskTicketsAll",
            labelKey: "sidebar.helpdeskTicketsAll",
            icon: "ListOrdered",
            path: "helpdesk/tickets?status=all",
          },
          {
            key: "helpdeskTicketsOpen",
            labelKey: "sidebar.helpdeskTicketsOpen",
            icon: "CircleDot",
            path: "helpdesk/tickets?status=open",
          },
          {
            key: "helpdeskTicketsPending",
            labelKey: "sidebar.helpdeskTicketsPending",
            icon: "Hourglass",
            path: "helpdesk/tickets?status=pending",
          },
          {
            key: "helpdeskTicketsResolved",
            labelKey: "sidebar.helpdeskTicketsResolved",
            icon: "CheckCircle2",
            path: "helpdesk/tickets?status=resolved",
          },
          {
            key: "helpdeskTicketsClosed",
            labelKey: "sidebar.helpdeskTicketsClosed",
            icon: "XCircle",
            path: "helpdesk/tickets?status=closed",
          },
        ],
      },
      {
        key: "helpdeskEmail",
        labelKey: "sidebar.helpdeskEmail",
        icon: "Mail",
        path: "helpdesk/email",
      },
      {
        key: "helpdeskWhatsApp",
        labelKey: "sidebar.helpdeskWhatsApp",
        icon: "Smartphone",
        path: "helpdesk/whatsapp",
      },
      {
        key: "helpdeskConversations",
        labelKey: "sidebar.helpdeskConversations",
        icon: "MessagesSquare",
        path: "helpdesk/conversations",
      },
      {
        key: "helpdeskSla",
        labelKey: "sidebar.helpdeskSla",
        icon: "Clock",
        path: "helpdesk/sla",
      },
      {
        key: "helpdeskAutomation",
        labelKey: "sidebar.helpdeskAutomation",
        icon: "Workflow",
        path: "helpdesk/automation",
      },
      {
        key: "helpdeskCannedResponses",
        labelKey: "sidebar.helpdeskCannedResponses",
        icon: "ScrollText",
        path: "helpdesk/canned-responses",
      },
      {
        key: "helpdeskTemplates",
        labelKey: "sidebar.helpdeskTemplates",
        icon: "FileText",
        path: "helpdesk/templates",
      },
      {
        key: "helpdeskKnowledgeBase",
        labelKey: "sidebar.helpdeskKnowledgeBase",
        icon: "BookOpen",
        path: "helpdesk/knowledge-base",
      },
      {
        key: "helpdeskReports",
        labelKey: "sidebar.helpdeskReports",
        icon: "BarChart3",
        path: "helpdesk/reports",
      },
      {
        key: "helpdeskChannels",
        labelKey: "sidebar.helpdeskChannels",
        icon: "Settings",
        path: "helpdesk/channels",
        children: [
          {
            key: "helpdeskMailboxes",
            labelKey: "sidebar.helpdeskChannelsEmail",
            icon: "Mail",
            path: "helpdesk/mailboxes",
          },
          {
            key: "helpdeskChannelsWhatsApp",
            labelKey: "sidebar.helpdeskChannelsWhatsApp",
            icon: "Smartphone",
            path: "helpdesk/channels/whatsapp",
          },
          {
            key: "helpdeskChannelsWebChat",
            labelKey: "sidebar.helpdeskChannelsWebChat",
            icon: "MessagesSquare",
            path: "helpdesk/channels/web-chat",
          },
          {
            key: "helpdeskChannelsSms",
            labelKey: "sidebar.helpdeskChannelsSms",
            icon: "Phone",
            path: "helpdesk/channels/sms",
          },
        ],
      },
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

export type MenuFormMode = "list" | "create" | "view" | "edit";

/** Resolves list vs create/view/edit mock form routes under a menu leaf path. */
export function resolveMenuFormRoute(path: string):
  | { menuItem: MenuItem; formMode: MenuFormMode; recordId?: string }
  | undefined {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  const exact = findMenuItemByPath(normalized);
  if (exact) return { menuItem: exact, formMode: "list" };

  if (normalized.endsWith("/new")) {
    const base = normalized.slice(0, -"/new".length);
    const menuItem = findMenuItemByPath(base);
    if (menuItem) return { menuItem, formMode: "create" };
  }

  if (normalized.endsWith("/edit")) {
    const withoutEdit = normalized.slice(0, -"/edit".length);
    const lastSlash = withoutEdit.lastIndexOf("/");
    if (lastSlash > 0) {
      const base = withoutEdit.slice(0, lastSlash);
      const recordId = withoutEdit.slice(lastSlash + 1);
      const menuItem = findMenuItemByPath(base);
      if (menuItem && recordId) return { menuItem, formMode: "edit", recordId };
    }
  }

  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash > 0) {
    const base = normalized.slice(0, lastSlash);
    const recordId = normalized.slice(lastSlash + 1);
    const menuItem = findMenuItemByPath(base);
    if (menuItem && recordId) return { menuItem, formMode: "view", recordId };
  }

  return undefined;
}

/** Flat list of every navigable leaf (nested group nodes excluded). */
export function flatMenuItems(): MenuItem[] {
  function leaves(items: MenuItem[]): MenuItem[] {
    return items.flatMap((item) => (item.children ? leaves(item.children) : [item]));
  }
  return leaves(MENU_ITEMS);
}

/** Top-level menu group that contains a leaf/sub-group key (for breadcrumbs / topbar). */
export function findTopMenuGroup(key: ModuleKey | string): MenuItem | undefined {
  function contains(items: MenuItem[] | undefined, target: string): boolean {
    if (!items) return false;
    return items.some((item) => item.key === target || contains(item.children, target));
  }
  return MENU_ITEMS.find((group) => group.key === key || contains(group.children, key));
}

/** Find a menu item (group or leaf) by key anywhere in MENU_ITEMS. */
export function findMenuItemByKey(key: ModuleKey | string): MenuItem | undefined {
  function walk(items: MenuItem[]): MenuItem | undefined {
    for (const item of items) {
      if (item.key === key) return item;
      if (item.children?.length) {
        const found = walk(item.children);
        if (found) return found;
      }
    }
    return undefined;
  }
  return walk(MENU_ITEMS);
}

export function can(
  roleDef: RoleDef | undefined,
  module: ModuleKey | string,
  action: PermissionAction
): boolean {
  if (!roleDef) return false;
  if (roleDef.permissions[module as ModuleKey]?.includes(action)) return true;

  // Group keys (e.g. helpdeskTickets) are not granted as leaves — allow if any child leaf is granted.
  const item = findMenuItemByKey(module);
  if (item?.children?.length) {
    const leaves = flatMenuItems().filter((leaf) => {
      function under(node: MenuItem): boolean {
        if (!node.children) return false;
        return node.children.some((c) => c.key === leaf.key || under(c));
      }
      return under(item);
    });
    return leaves.some((leaf) => roleDef.permissions[leaf.key as ModuleKey]?.includes(action));
  }

  return false;
}

export function getMenuForRole(
  roleDef: RoleDef | undefined,
  options?: { platformMode?: boolean; allowedMenuUrls?: string[] | Set<string> }
): MenuItem[] {
  if (!roleDef) return [];
  const role = roleDef;
  const platformMode = !!options?.platformMode && role.id === SUPER_ADMIN_ROLE_ID;

  function filterItems(items: MenuItem[]): MenuItem[] {
    return items.reduce<MenuItem[]>((acc, item) => {
      // Platform masters (incl. Users) only when Super Admin has no tenant selected.
      if (!platformMode && (item.key === "globalTenantSettings" || GLOBAL_TENANT_SETTING_KEYS.includes(item.key as ModuleKey))) {
        return acc;
      }

      if (platformMode && !PLATFORM_MODE_MENU_KEYS.has(item.key as ModuleKey) && !item.children) {
        return acc;
      }

      if (item.children) {
        if (platformMode && !PLATFORM_MODE_MENU_KEYS.has(item.key as ModuleKey)) return acc;
        const visibleChildren = filterItems(item.children);
        if (visibleChildren.length > 0) acc.push({ ...item, children: visibleChildren });
        return acc;
      }

      // Tenant registry + global tenant settings are Super Admin only.
      if (GLOBAL_TENANT_SETTING_KEYS.includes(item.key as ModuleKey) && role.id !== SUPER_ADMIN_ROLE_ID) return acc;
      if (can(role, item.key as ModuleKey, "view")) acc.push(item);
      return acc;
    }, []);
  }

  const roleMenus = filterItems(MENU_ITEMS);

  // Tenant workspace: only show menus linked to modules granted to this tenant.
  if (!platformMode && options?.allowedMenuUrls) {
    const allowed =
      options.allowedMenuUrls instanceof Set
        ? options.allowedMenuUrls
        : new Set(
            options.allowedMenuUrls
              .map((u) => u.trim().replace(/^\/+|\/+$/g, "").toLowerCase())
              .filter(Boolean)
          );
    const alwaysKeys = new Set<string>([]);

    function pathAllowed(itemPath: string): boolean {
      const path = itemPath.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
      if (!path) return false;
      for (const a of allowed) {
        if (path === a || path.startsWith(`${a}/`) || a.startsWith(`${path}/`)) return true;
      }
      return false;
    }

    function filterByUrls(items: MenuItem[]): MenuItem[] {
      return items.reduce<MenuItem[]>((acc, item) => {
        if (alwaysKeys.has(item.key)) {
          acc.push(item);
          return acc;
        }
        if (item.children?.length) {
          if (pathAllowed(item.path)) {
            acc.push(item);
            return acc;
          }
          const children = filterByUrls(item.children);
          if (children.length > 0) acc.push({ ...item, children });
          return acc;
        }
        if (pathAllowed(item.path)) acc.push(item);
        return acc;
      }, []);
    }

    return filterByUrls(roleMenus);
  }

  return roleMenus;
}

export function roleHomePath(roleDef: RoleDef): string {
  return `/${roleDef.slug}/dashboard`;
}

/** All leaf ModuleKeys — used when seeding full-access roles. */
export function allLeafModuleKeys(): ModuleKey[] {
  return flatMenuItems().map((item) => item.key as ModuleKey);
}
