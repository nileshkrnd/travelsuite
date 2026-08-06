/**
 * Initial SubscriptionModuleMenu trees for seed.
 * After seed, menus are maintained in the database (not from MENU_ITEMS).
 */

export type SeedMenuNode = {
  name: string;
  url: string;
  icon: string;
  children?: SeedMenuNode[];
};

/**
 * Administration menu URL → Subscription Product names that unlock it.
 * Empty array / missing key = common (visible whenever Administration is shown).
 */
export const ADMIN_MENU_PRODUCT_LINKS: Record<string, string[]> = {
  dashboard: [],
  administration: [],
  "administration/company": ["Travel"],
  "masters/company": ["Travel"],
  "masters/branch": ["Travel"],
  "masters/branch-type": ["Travel"],
  "administration/masters": ["Travel", "HRMS (Human Resource Management System)"],
  "masters/department": ["Travel", "HRMS (Human Resource Management System)"],
  "masters/designation": ["Travel", "HRMS (Human Resource Management System)"],
  "masters/access-role": ["Travel"],
  "administration/permissions": ["Travel"],
  "administration/hr-masters": ["Travel", "HRMS (Human Resource Management System)"],
  "administration/hr-masters/grade": ["Travel", "HRMS (Human Resource Management System)"],
  "administration/hr-masters/shift": ["Travel", "HRMS (Human Resource Management System)"],
  "administration/hr-masters/leave-type": ["Travel", "HRMS (Human Resource Management System)"],
  "administration/hr-masters/holiday-calendar": [
    "Travel",
    "HRMS (Human Resource Management System)",
  ],
  "administration/hr-masters/salary-component": [
    "Travel",
    "HRMS (Human Resource Management System)",
  ],
  "administration/hr-masters/document-type": [
    "Travel",
    "HRMS (Human Resource Management System)",
  ],
  "administration/exchange-rate": ["Travel"],
  "administration/employees": ["Travel", "HRMS (Human Resource Management System)"],
  "masters/employee": ["Travel", "HRMS (Human Resource Management System)"],
  "administration/employee-gds-sign": ["Travel"],
  "administration/customers": ["Travel"],
  "administration/customers/cash": ["Travel"],
  "masters/corporateAccounts": ["Travel"],
  "masters/subAgency": ["Travel"],
  "administration/suppliers": ["Travel"],
  "masters/supplier": ["Travel"],
  "administration/credit-control": ["Travel"],
  "administration/product": ["Travel", "Real Estate"],
  "masters/property": ["Travel", "Real Estate"],
};

export const MODULE_MENU_SEEDS: Record<string, SeedMenuNode[]> = {
  Administration: [
    {
      name: "Dashboard",
      url: "dashboard",
      icon: "LayoutDashboard",
    },
    {
      name: "Administration",
      url: "administration",
      icon: "ShieldCheck",
      children: [
        {
          name: "Company",
          url: "administration/company",
          icon: "Building2",
          children: [
            { name: "Company", url: "masters/company", icon: "Building2" },
            { name: "Branch", url: "masters/branch", icon: "GitBranch" },
            { name: "Branch Type", url: "masters/branch-type", icon: "ListTree" },
          ],
        },
        {
          name: "Masters",
          url: "administration/masters",
          icon: "Layers",
          children: [
            { name: "Department", url: "masters/department", icon: "Network" },
            { name: "Designation", url: "masters/designation", icon: "Briefcase" },
            { name: "Access Role", url: "masters/access-role", icon: "KeyRound" },
            { name: "Permissions", url: "administration/permissions", icon: "Lock" },
          ],
        },
        {
          name: "HR Masters",
          url: "administration/hr-masters",
          icon: "Users",
          children: [
            { name: "Grade", url: "administration/hr-masters/grade", icon: "Tags" },
            { name: "Shift", url: "administration/hr-masters/shift", icon: "Clock" },
            { name: "Leave Type", url: "administration/hr-masters/leave-type", icon: "PalmTree" },
            {
              name: "Holiday Calendar",
              url: "administration/hr-masters/holiday-calendar",
              icon: "CalendarDays",
            },
            {
              name: "Salary Component",
              url: "administration/hr-masters/salary-component",
              icon: "BadgeDollarSign",
            },
            {
              name: "Document Type",
              url: "administration/hr-masters/document-type",
              icon: "FileBadge",
            },
          ],
        },
        {
          name: "Exchange Rate",
          url: "administration/exchange-rate",
          icon: "ArrowLeftRight",
        },
        {
          name: "Employee",
          url: "administration/employees",
          icon: "UserCog",
          children: [
            { name: "Employee", url: "masters/employee", icon: "UserCog" },
            {
              name: "Employee GDS Sign",
              url: "administration/employee-gds-sign",
              icon: "KeyRound",
            },
          ],
        },
        {
          name: "Customers",
          url: "administration/customers",
          icon: "Users2",
          children: [
            { name: "Cash", url: "administration/customers/cash", icon: "Wallet" },
            { name: "Corporate", url: "masters/corporateAccounts", icon: "Landmark" },
            { name: "Sub Agent", url: "masters/subAgency", icon: "GitFork" },
          ],
        },
        {
          name: "Suppliers",
          url: "administration/suppliers",
          icon: "Store",
          children: [
            { name: "Supplier", url: "masters/supplier", icon: "Store" },
          ],
        },
        {
          name: "Credit Control",
          url: "administration/credit-control",
          icon: "CreditCard",
        },
        {
          name: "Product",
          url: "administration/product",
          icon: "Package",
          children: [{ name: "Property", url: "masters/property", icon: "Building" }],
        },
      ],
    },
  ],
  POS: [
    {
      name: "POS",
      url: "sales",
      icon: "Store",
      children: [
        { name: "Sales Dashboard", url: "sales/dashboard", icon: "LayoutDashboard" },
        {
          name: "Book Offline",
          url: "book-offline",
          icon: "BookMarked",
          children: [
            { name: "Flight", url: "book-offline/flight", icon: "Plane" },
            { name: "Hotel", url: "book-offline/hotel", icon: "BedDouble" },
            { name: "Transfer", url: "book-offline/transfer", icon: "Car" },
            { name: "Rail", url: "book-offline/rail", icon: "TrainFront" },
            { name: "Miscellaneous", url: "book-offline/miscellaneous", icon: "MoreHorizontal" },
          ],
        },
        {
          name: "Book Online",
          url: "book-online",
          icon: "Globe",
          children: [
            { name: "Flight", url: "book-online/flight", icon: "Plane" },
            { name: "Hotel", url: "book-online/hotel", icon: "BedDouble" },
            { name: "Transfer", url: "book-online/transfer", icon: "Car" },
          ],
        },
      ],
    },
  ],
  "Inventory Core": [
    {
      name: "Inventory Management",
      url: "inventory",
      icon: "Warehouse",
      children: [
        { name: "Inventory Dashboard", url: "inventory/dashboard", icon: "LayoutDashboard" },
        {
          name: "Inventory Masters",
          url: "inventory/masters",
          icon: "Layers",
          children: [
            { name: "Warehouse", url: "inventory/masters/warehouse", icon: "Warehouse" },
            { name: "Products / Items", url: "inventory/masters/items", icon: "Package" },
            { name: "Category", url: "inventory/masters/category", icon: "Tags" },
            { name: "UOM", url: "inventory/masters/uom", icon: "ListOrdered" },
          ],
        },
        {
          name: "Purchasing",
          url: "inventory/purchasing",
          icon: "ShoppingCart",
          children: [
            {
              name: "Purchase Orders",
              url: "inventory/purchasing/purchase-orders",
              icon: "ShoppingCart",
            },
          ],
        },
        {
          name: "Stock Operations",
          url: "inventory/stock",
          icon: "Boxes",
          children: [
            { name: "Stock In", url: "inventory/stock/stock-in", icon: "ArrowDownToLine" },
            { name: "Stock Out", url: "inventory/stock/stock-out", icon: "ArrowUpFromLine" },
            { name: "Transfers", url: "inventory/stock/transfers", icon: "ArrowLeftRight" },
            { name: "Adjustment", url: "inventory/stock/adjustment", icon: "RefreshCw" },
            { name: "Stock Take", url: "inventory/stock/stock-take", icon: "ClipboardCheck" },
          ],
        },
        {
          name: "Inventory Reports",
          url: "inventory/reports",
          icon: "BarChart3",
          children: [
            { name: "Stock On Hand", url: "inventory/reports/stock-on-hand", icon: "Package" },
            { name: "Stock Ledger", url: "inventory/reports/stock-ledger", icon: "BookMarked" },
            { name: "Low Stock", url: "inventory/reports/low-stock", icon: "Hourglass" },
          ],
        },
      ],
    },
  ],
  HRMS: [
    {
      name: "HRMS",
      url: "hrms",
      icon: "Users",
      children: [
        { name: "HRMS Dashboard", url: "hrms/dashboard", icon: "LayoutDashboard" },
        { name: "Employees", url: "hrms/employees", icon: "Users2" },
        {
          name: "Attendance",
          url: "hrms/attendance",
          icon: "Clock",
          children: [
            { name: "Daily Attendance", url: "hrms/attendance/daily", icon: "CalendarCheck" },
            { name: "Roster", url: "hrms/attendance/roster", icon: "ListOrdered" },
            { name: "Regularization", url: "hrms/attendance/regularization", icon: "RefreshCw" },
          ],
        },
        {
          name: "Leave",
          url: "hrms/leave",
          icon: "PalmTree",
          children: [
            { name: "Leave Requests", url: "hrms/leave/requests", icon: "FilePlus" },
            { name: "Leave Balance", url: "hrms/leave/balance", icon: "Scale" },
            { name: "Leave Policy", url: "hrms/leave/policy", icon: "ClipboardCheck" },
          ],
        },
        {
          name: "Payroll",
          url: "hrms/payroll",
          icon: "Wallet",
          children: [
            { name: "Salary Structure", url: "hrms/payroll/structure", icon: "Layers" },
            { name: "Payroll Run", url: "hrms/payroll/run", icon: "Receipt" },
            { name: "Loans", url: "hrms/payroll/loans", icon: "CreditCard" },
          ],
        },
        {
          name: "Recruitment",
          url: "hrms/recruitment",
          icon: "UserPlus",
          children: [
            { name: "Jobs", url: "hrms/recruitment/jobs", icon: "Briefcase" },
            { name: "Candidates", url: "hrms/recruitment/candidates", icon: "UserCheck" },
            { name: "Interviews", url: "hrms/recruitment/interviews", icon: "Users" },
          ],
        },
        {
          name: "Performance",
          url: "hrms/performance",
          icon: "TrendingUp",
          children: [
            { name: "Goals", url: "hrms/performance/goals", icon: "Target" },
            { name: "Appraisals", url: "hrms/performance/appraisals", icon: "ClipboardCheck" },
          ],
        },
        {
          name: "Documents",
          url: "hrms/documents",
          icon: "FileText",
          children: [
            { name: "Letters", url: "hrms/documents/letters", icon: "FileSignature" },
            {
              name: "Employee Documents",
              url: "hrms/documents/employee-documents",
              icon: "FileBadge",
            },
          ],
        },
        {
          name: "Exit",
          url: "hrms/exit",
          icon: "LogOut",
          children: [
            { name: "Resignation", url: "hrms/exit/resignation", icon: "FileText" },
            { name: "Gratuity", url: "hrms/exit/gratuity", icon: "Gift" },
            { name: "Final Settlement", url: "hrms/exit/settlement", icon: "Scale" },
          ],
        },
      ],
    },
  ],
  "Finance Core": [
    {
      name: "Finance",
      url: "accounts",
      icon: "Landmark",
      children: [
        { name: "Finance Dashboard", url: "accounts/dashboard", icon: "LayoutDashboard" },
        {
          name: "Setup",
          url: "accounts/setup",
          icon: "Settings",
          children: [
            { name: "Account Group", url: "accounts/group", icon: "ListTree" },
            { name: "Chart of Accounts", url: "accounts/chart-of-accounts", icon: "BookOpen" },
            { name: "Ledger", url: "accounts/ledger", icon: "BookMarked" },
            { name: "Fiscal Year / Period", url: "accounts/setup/fiscal-year", icon: "CalendarDays" },
          ],
        },
        {
          name: "Vouchers",
          url: "accounts/vouchers",
          icon: "ScrollText",
          children: [
            { name: "Journal", url: "accounts/vouchers/journal", icon: "FileSignature" },
            { name: "Sales", url: "accounts/vouchers/sales", icon: "ShoppingBag" },
            { name: "Purchase", url: "accounts/vouchers/purchase", icon: "ShoppingCart" },
            { name: "Contra", url: "accounts/vouchers/contra", icon: "ArrowLeftRight" },
            { name: "Receipt", url: "accounts/vouchers/receipt", icon: "Receipt" },
            { name: "Payment", url: "accounts/vouchers/payment", icon: "CreditCard" },
            { name: "Credit Note", url: "accounts/vouchers/credit-note", icon: "FilePlus" },
            { name: "Debit Note", url: "accounts/vouchers/debit-note", icon: "FileText" },
          ],
        },
        {
          name: "Receivables & Payables",
          url: "accounts/receivables-payables",
          icon: "BadgeDollarSign",
          children: [
            {
              name: "Customer Outstanding",
              url: "accounts/receivables-payables/customer-outstanding",
              icon: "Users",
            },
            {
              name: "Vendor Outstanding",
              url: "accounts/receivables-payables/vendor-outstanding",
              icon: "Store",
            },
            {
              name: "Ageing (AR)",
              url: "accounts/receivables-payables/ageing-ar",
              icon: "Hourglass",
            },
            {
              name: "Ageing (AP)",
              url: "accounts/receivables-payables/ageing-ap",
              icon: "Hourglass",
            },
          ],
        },
        {
          name: "Bank",
          url: "accounts/bank",
          icon: "Landmark",
          children: [
            { name: "Bank Accounts", url: "accounts/bank/accounts", icon: "Wallet" },
            {
              name: "Bank Reconciliation",
              url: "accounts/bank/reconciliation",
              icon: "ArrowLeftRight",
            },
          ],
        },
        {
          name: "Supplier",
          url: "accounts/supplier",
          icon: "Store",
          children: [
            {
              name: "Supplier Reconciliation",
              url: "accounts/supplier/reconciliation",
              icon: "ArrowLeftRight",
            },
          ],
        },
        {
          name: "Company Reports",
          url: "accounts/company-reports",
          icon: "BarChart3",
          children: [
            {
              name: "Trial Balance",
              url: "accounts/reports/trial-balance",
              icon: "FileSpreadsheet",
            },
            {
              name: "Profit & Loss",
              url: "accounts/reports/profit-and-loss",
              icon: "TrendingUp",
            },
            { name: "Balance Sheet", url: "accounts/reports/balance-sheet", icon: "Scale" },
            {
              name: "General Ledger",
              url: "accounts/company-reports/general-ledger",
              icon: "BookOpen",
            },
            {
              name: "Voucher Register",
              url: "accounts/company-reports/voucher-register",
              icon: "ScrollText",
            },
          ],
        },
        {
          name: "Group Consolidated Reports",
          url: "accounts/group-reports",
          icon: "Building2",
          children: [
            {
              name: "Consolidated Trial Balance",
              url: "accounts/group-reports/trial-balance",
              icon: "FileSpreadsheet",
            },
            {
              name: "Consolidated Profit & Loss",
              url: "accounts/group-reports/profit-and-loss",
              icon: "TrendingUp",
            },
            {
              name: "Consolidated Balance Sheet",
              url: "accounts/group-reports/balance-sheet",
              icon: "Scale",
            },
            {
              name: "Company Comparison",
              url: "accounts/group-reports/company-comparison",
              icon: "GitBranch",
            },
          ],
        },
        {
          name: "Period Close",
          url: "accounts/period-close",
          icon: "Lock",
          children: [
            { name: "Period Lock", url: "accounts/period-close/period-lock", icon: "Lock" },
            {
              name: "Year-End Close",
              url: "accounts/period-close/year-end",
              icon: "CalendarDays",
            },
          ],
        },
      ],
    },
  ],
  B2B: [
    {
      name: "B2B",
      url: "b2b",
      icon: "Network",
      children: [
        { name: "B2B Dashboard", url: "b2b/dashboard", icon: "LayoutDashboard" },
        { name: "Booking", url: "b2b/booking", icon: "CalendarCheck" },
        { name: "Wallet", url: "b2b/wallet", icon: "Wallet" },
        { name: "Statements", url: "b2b/statements", icon: "FileSpreadsheet" },
        { name: "Reports", url: "b2b/reports", icon: "BarChart3" },
      ],
    },
  ],
  CBT: [
    {
      name: "CBT",
      url: "cbt",
      icon: "Briefcase",
      children: [
        { name: "CBT Dashboard", url: "cbt/dashboard", icon: "LayoutDashboard" },
      ],
    },
  ],
  API: [
    {
      name: "API",
      url: "api",
      icon: "Code2",
      children: [
        { name: "API Dashboard", url: "api/dashboard", icon: "LayoutDashboard" },
      ],
    },
  ],
  B2C: [
    {
      name: "B2C",
      url: "b2c",
      icon: "Store",
      children: [
        { name: "B2C Dashboard", url: "b2c/dashboard", icon: "LayoutDashboard" },
      ],
    },
  ],
  CRM: [
    {
      name: "CRM",
      url: "crm",
      icon: "Handshake",
      children: [
        { name: "CRM Dashboard", url: "crm/dashboard", icon: "LayoutDashboard" },
        { name: "Leads", url: "crm/leads", icon: "Target" },
        { name: "Opportunities", url: "crm/opportunities", icon: "TrendingUp" },
        { name: "Customers", url: "crm/customers", icon: "Users" },
        { name: "Campaigns", url: "crm/campaigns", icon: "Megaphone" },
      ],
    },
  ],
  Helpdesk: [
    {
      name: "Helpdesk",
      url: "helpdesk",
      icon: "Headphones",
      children: [
        { name: "Helpdesk Dashboard", url: "helpdesk/dashboard", icon: "LayoutDashboard" },
        { name: "Support Tickets", url: "helpdesk/tickets", icon: "Ticket" },
      ],
    },
  ],
  Extranet: [
    {
      name: "Extranet",
      url: "extranet",
      icon: "Globe2",
      children: [
        { name: "Extranet Dashboard", url: "extranet/dashboard", icon: "LayoutDashboard" },
        { name: "Property Management", url: "extranet/property", icon: "Home" },
        { name: "Contracts", url: "extranet/contracts", icon: "FileSignature" },
        { name: "Inventory", url: "extranet/inventory", icon: "Boxes" },
        { name: "Rates", url: "extranet/rates", icon: "BadgeDollarSign" },
        { name: "Availability Calendar", url: "extranet/availability", icon: "CalendarCheck" },
        { name: "Promotions", url: "extranet/promotions", icon: "Megaphone" },
        { name: "Stop Sales", url: "extranet/stop-sales", icon: "Ban" },
        { name: "Blackout Dates", url: "extranet/blackout-dates", icon: "CalendarOff" },
        { name: "Channel Connectivity", url: "extranet/connectivity", icon: "Workflow" },
        { name: "Reviews & Ratings", url: "extranet/reviews", icon: "Star" },
        { name: "Bookings", url: "extranet/bookings", icon: "CalendarCheck" },
        { name: "Reports", url: "extranet/reports", icon: "BarChart3" },
      ],
    },
  ],
  "Property Management": [
    {
      name: "Property Management",
      url: "real-estate",
      icon: "Building2",
      children: [
        { name: "Properties", url: "real-estate/properties", icon: "Home" },
      ],
    },
  ],
  "Tenant Management": [
    {
      name: "Tenant Management",
      url: "real-estate/tenants",
      icon: "Users",
      children: [
        { name: "Tenants", url: "real-estate/tenants/list", icon: "Users2" },
      ],
    },
  ],
  "Facility Operations": [
    {
      name: "Facility Operations",
      url: "facility",
      icon: "Wrench",
      children: [
        { name: "Facility Dashboard", url: "facility/dashboard", icon: "LayoutDashboard" },
      ],
    },
  ],
  "Fleet Operations": [
    {
      name: "Fleet Operations",
      url: "fleet",
      icon: "Truck",
      children: [
        { name: "Fleet Dashboard", url: "fleet/dashboard", icon: "LayoutDashboard" },
      ],
    },
  ],
  "Asset Core": [
    {
      name: "Assets",
      url: "assets",
      icon: "Package",
      children: [
        { name: "Assets Dashboard", url: "assets/dashboard", icon: "LayoutDashboard" },
        { name: "Asset List", url: "assets/list", icon: "Package" },
        { name: "Categories", url: "assets/categories", icon: "Tags" },
        { name: "Assignment", url: "assets/assignment", icon: "UserCheck" },
        { name: "Maintenance", url: "assets/maintenance", icon: "Wrench" },
        { name: "Depreciation", url: "assets/depreciation", icon: "TrendingDown" },
      ],
    },
  ],
  "Procurement Core": [
    {
      name: "Procurement",
      url: "procurement",
      icon: "ShoppingCart",
      children: [
        { name: "Procurement Dashboard", url: "procurement/dashboard", icon: "LayoutDashboard" },
        { name: "Requisitions", url: "procurement/requisitions", icon: "ClipboardCheck" },
        { name: "RFQ", url: "procurement/rfq", icon: "FileSignature" },
        { name: "Purchase Orders", url: "procurement/purchase-orders", icon: "ShoppingCart" },
        { name: "Vendors", url: "procurement/vendors", icon: "Store" },
        { name: "Goods Receipt", url: "procurement/goods-receipt", icon: "ArrowDownToLine" },
        { name: "Vendor Invoices", url: "procurement/vendor-invoices", icon: "Receipt" },
        { name: "Contracts", url: "procurement/contracts", icon: "FileText" },
        { name: "Reports", url: "procurement/reports", icon: "BarChart3" },
      ],
    },
  ],
  "Hospitality Core": [
    {
      name: "Hospitality",
      url: "hospitality",
      icon: "BedDouble",
      children: [
        { name: "Hospitality Dashboard", url: "hospitality/dashboard", icon: "LayoutDashboard" },
      ],
    },
  ],
};
