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
        { name: "Company", url: "masters/company", icon: "Building2" },
        { name: "Branch", url: "masters/branch", icon: "GitBranch" },
        { name: "Branch Type", url: "masters/branch-type", icon: "ListTree" },
        { name: "Department", url: "masters/department", icon: "Network" },
        { name: "Designation", url: "masters/designation", icon: "Briefcase" },
        { name: "Employee", url: "masters/employee", icon: "UserCog" },
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
        { name: "Access Role", url: "masters/access-role", icon: "KeyRound" },
        { name: "Roles", url: "masters/roles", icon: "KeyRound" },
        { name: "Permissions", url: "administration/permissions", icon: "Lock" },
        {
          name: "Approval Matrix",
          url: "administration/approval-matrix",
          icon: "ClipboardCheck",
        },
        { name: "Holidays", url: "administration/holidays", icon: "CalendarDays" },
        { name: "Masters Hub", url: "administration/masters", icon: "Layers" },
        { name: "Product", url: "masters/product", icon: "Package" },
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
  Inventory: [
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
  Accounts: [
    {
      name: "Accounts",
      url: "accounts",
      icon: "Landmark",
      children: [
        { name: "Accounts Dashboard", url: "accounts/dashboard", icon: "LayoutDashboard" },
        { name: "Account Group", url: "accounts/group", icon: "ListTree" },
        { name: "Ledger", url: "accounts/ledger", icon: "BookMarked" },
        { name: "Chart of Accounts", url: "accounts/chart-of-accounts", icon: "BookOpen" },
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
      ],
    },
  ],
  Reports: [
    {
      name: "Accounts Reports",
      url: "accounts/reports",
      icon: "BarChart3",
      children: [
        { name: "Balance Sheet", url: "accounts/reports/balance-sheet", icon: "Scale" },
        { name: "Profit & Loss", url: "accounts/reports/profit-and-loss", icon: "TrendingUp" },
        { name: "Trial Balance", url: "accounts/reports/trial-balance", icon: "FileSpreadsheet" },
      ],
    },
  ],
};
