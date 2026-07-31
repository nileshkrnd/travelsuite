/**
 * Marketing catalog aligned with Subscription Product / Module seed.
 * Copy is written for executive / industry review — not generic SaaS filler.
 */

export type NexusModule = {
  name: string;
  summary: string;
  capabilities: string[];
};

export type NexusProduct = {
  id: string;
  name: string;
  shortName: string;
  industry: string;
  summary: string;
  outcomes: string[];
  icon: string;
  accent: string;
  modules: NexusModule[];
};

export const NEXUS_PRODUCTS: NexusProduct[] = [
  {
    id: "administration",
    name: "Administration",
    shortName: "Administration",
    industry: "Group master data & access",
    summary:
      "The shared operating layer for the holding. Companies, branches, departments, designations, employees and access roles are defined once and reused by every licensed product — so Travel, Finance and Real Estate do not maintain separate org charts.",
    outcomes: [
      "Single source of truth for organisation structure",
      "Role-based access aligned to Module Access grants",
      "Menus for Administration products appear only where licensed",
    ],
    icon: "Building2",
    accent: "#0EA5C8",
    modules: [
      {
        name: "Administration",
        summary: "Company, branch and workforce setup used across the platform.",
        capabilities: [
          "Company & branch master",
          "Department & designation",
          "Employee records",
          "Access roles & permissions",
        ],
      },
    ],
  },
  {
    id: "travel",
    name: "Travel",
    shortName: "Travel",
    industry: "Travel management & distribution",
    summary:
      "End-to-end travel operations for agency, corporate and leisure channels. Front-office booking, mid-office control and distribution portals sit on the same product, with separate licensing for B2B, B2C, CBT and API so each channel can be enabled without exposing unused menus.",
    outcomes: [
      "Unified PNR / booking lifecycle from quote to ticket",
      "Channel separation (retail, agent, corporate, API)",
      "Content connectivity for GDS, NDC, LCC and third-party suppliers",
    ],
    icon: "Plane",
    accent: "#2A78D6",
    modules: [
      {
        name: "POS",
        summary: "Consultant and branch counter booking desk for air, hotel and packages.",
        capabilities: ["Shopping & fare quote", "PNR create / modify", "Ticketing & EMDs", "Branch queue"],
      },
      {
        name: "B2B",
        summary: "Agent portal for sub-agencies and trade partners (licensed as a separate channel).",
        capabilities: ["Agent credit & mark-up", "Booking for end clients", "Document download", "Agency hierarchy"],
      },
      {
        name: "CBT",
        summary: "Corporate booking tool with policy, approval and duty-of-care controls.",
        capabilities: ["Travel policy engine", "Approver workflows", "Preferred content", "Trip reporting"],
      },
      {
        name: "B2C",
        summary: "Consumer / OTA storefront for direct leisure sales under your brand.",
        capabilities: ["Online search & book", "Payment hand-off", "My trips", "Promotions"],
      },
      {
        name: "API",
        summary: "Integration layer for GDS, NDC, LCC and supplier connectors.",
        capabilities: ["Multi-source shopping", "Order / PNR sync", "Hotel mapping", "Usage metering"],
      },
    ],
  },
  {
    id: "real-estate",
    name: "Real Estate",
    shortName: "Real Estate",
    industry: "Property investment & leasing",
    summary:
      "Portfolio and leasing operations for residential and commercial assets. Property inventory, unit status and tenant contracts are managed in one place and can post commercial events into group Finance.",
    outcomes: [
      "Clear view of stock by building, unit and occupancy",
      "Lease lifecycle from offer to renewal or exit",
      "Rent and charge schedules ready for finance posting",
    ],
    icon: "Home",
    accent: "#1BAF7A",
    modules: [
      {
        name: "Property Management",
        summary: "Buildings, units, amenities and ownership / portfolio records.",
        capabilities: ["Property & unit register", "Availability status", "Owner / portfolio tags", "Document vault"],
      },
      {
        name: "Tenant Management",
        summary: "Lease administration, renewals, deposits and tenant communications.",
        capabilities: ["Lease contracts", "Renewal & notice periods", "Security deposits", "Tenant ledger link"],
      },
    ],
  },
  {
    id: "hospitality",
    name: "Hospitality",
    shortName: "Hospitality",
    industry: "Hotels & F&B operations",
    summary:
      "Hotel and outlet operations covering room inventory, reservations, guest stay and F&B activity, with revenue and cost flows designed to reconcile to Finance.",
    outcomes: [
      "Front-office stay cycle from reservation to checkout",
      "Room and rate inventory visibility",
      "Outlet activity linked to group reporting",
    ],
    icon: "BedDouble",
    accent: "#C45B86",
    modules: [
      {
        name: "Hospitality Core",
        summary: "Rooms, reservations, guest services and F&B operational records.",
        capabilities: ["Reservations & folio", "Housekeeping status", "F&B outlets", "Night audit path"],
      },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    shortName: "Finance",
    industry: "Financial accounting & control",
    summary:
      "General ledger, vouchers and statutory-style reporting for multi-company holdings. Chart of accounts, account groups, journals and period reports support travel sales, rent, hospitality and procurement in one books structure.",
    outcomes: [
      "Standard chart of accounts and account groups",
      "Voucher control (journal, sales, purchase, receipt, payment, contra)",
      "Balance sheet, P&L and trial balance by company",
    ],
    icon: "Wallet",
    accent: "#C99212",
    modules: [
      {
        name: "Finance Core",
        summary: "Ledgers, vouchers and financial statements.",
        capabilities: [
          "Chart of accounts",
          "Journal & operational vouchers",
          "Cost centre / department tags",
          "Financial reports",
        ],
      },
    ],
  },
  {
    id: "hrms",
    name: "HRMS",
    shortName: "HRMS",
    industry: "Human capital management",
    summary:
      "Workforce administration across companies and branches — employee master, organisational placement, and the foundations for attendance, leave and payroll integration as the holding standardises HR processes.",
    outcomes: [
      "Employee master shared with Administration",
      "Org placement by company, branch, department and designation",
      "Consistent people data for access and reporting",
    ],
    icon: "Users",
    accent: "#5B6CFF",
    modules: [
      {
        name: "HRMS",
        summary: "Human resource operations for the group workforce.",
        capabilities: ["Employee lifecycle", "Org assignment", "Leave foundations", "Reporting hierarchy"],
      },
    ],
  },
  {
    id: "fleet",
    name: "Fleet Management",
    shortName: "Fleet",
    industry: "Vehicle & mobility operations",
    summary:
      "Vehicle register, assignment and trip operations for agency transfers, corporate cars and chauffeur services — with utilisation and cost visibility for operations and finance.",
    outcomes: [
      "Vehicle master with status and assignment",
      "Trip / transfer dispatch for airports and hotels",
      "Utilisation and maintenance tracking",
    ],
    icon: "Car",
    accent: "#0D9488",
    modules: [
      {
        name: "Fleet Operations",
        summary: "Vehicles, drivers, trips and operational control.",
        capabilities: ["Vehicle register", "Driver assignment", "Trip / transfer jobs", "Maintenance logs"],
      },
    ],
  },
  {
    id: "facility",
    name: "Facility Management",
    shortName: "Facility",
    industry: "Facilities & maintenance",
    summary:
      "Site and building operations for owned or managed properties — work orders, preventive maintenance and vendor coordination so facilities issues do not live only in email.",
    outcomes: [
      "Work-order intake and assignment",
      "Site / building coverage map",
      "SLA-oriented maintenance tracking",
    ],
    icon: "Wrench",
    accent: "#4D7C4A",
    modules: [
      {
        name: "Facility Operations",
        summary: "Facilities work orders, sites and maintenance routines.",
        capabilities: ["Work orders", "Preventive schedules", "Site register", "Vendor coordination"],
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory Management",
    shortName: "Inventory",
    industry: "Warehouse & stock control",
    summary:
      "Stock keeping for warehouses and stores — item masters, receipts, issues and transfers — suitable for hospitality consumables, office supply and operational inventory tied to Procurement.",
    outcomes: [
      "Multi-warehouse stock positions",
      "Goods receipt and issue discipline",
      "Inter-warehouse transfers with audit trail",
    ],
    icon: "Package",
    accent: "#B45309",
    modules: [
      {
        name: "Inventory Core",
        summary: "Stock, warehouses and inventory movements.",
        capabilities: ["Item / SKU master", "GRN & issues", "Stock transfers", "Stock valuation path"],
      },
    ],
  },
  {
    id: "asset",
    name: "Asset Management",
    shortName: "Assets",
    industry: "Fixed asset lifecycle",
    summary:
      "Register and track capital assets — IT, furniture, equipment and vehicles — from acquisition through custody, transfer and disposal, with hooks for depreciation and finance reporting.",
    outcomes: [
      "Central fixed-asset register",
      "Custody and location tracking",
      "Lifecycle events for audit and insurance",
    ],
    icon: "Boxes",
    accent: "#0F766E",
    modules: [
      {
        name: "Asset Core",
        summary: "Fixed assets, custody and lifecycle events.",
        capabilities: ["Asset register", "Assignment / custody", "Transfer & disposal", "Depreciation path"],
      },
    ],
  },
  {
    id: "procurement",
    name: "Procurement",
    shortName: "Procurement",
    industry: "Purchasing & vendor management",
    summary:
      "Source-to-order purchasing for the group — vendor master, requisitions, purchase orders and receipt against PO — so spend is controlled before it hits Finance and Inventory.",
    outcomes: [
      "Approved vendor catalogue",
      "PO control with approval path",
      "Receipt against order for three-way match readiness",
    ],
    icon: "ShoppingCart",
    accent: "#9D174D",
    modules: [
      {
        name: "Procurement Core",
        summary: "Vendors, purchase orders and purchasing control.",
        capabilities: ["Vendor master", "PR / PO cycle", "Goods receipt link", "Spend visibility"],
      },
    ],
  },
  {
    id: "crm",
    name: "CRM",
    shortName: "CRM",
    industry: "Sales & customer relationship",
    summary:
      "Account and opportunity management for corporate travel, property sales and group services. Pipeline, activities and account history stay with the commercial team while fulfilment continues in Travel or Real Estate.",
    outcomes: [
      "Account and contact directory",
      "Opportunity pipeline with stages",
      "Activity history for account managers",
    ],
    icon: "Handshake",
    accent: "#1D4ED8",
    modules: [
      {
        name: "CRM",
        summary: "Leads, opportunities, accounts and commercial activities.",
        capabilities: ["Lead capture", "Opportunity stages", "Account plans", "Activity / task log"],
      },
    ],
  },
  {
    id: "helpdesk",
    name: "Helpdesk",
    shortName: "Helpdesk",
    industry: "Service desk & case management",
    summary:
      "Case management for customer and internal support — ticketing, priorities, assignment and SLA tracking across Travel, IT and property service desks.",
    outcomes: [
      "Single ticket inbox with categories",
      "Assignment, escalation and SLA clocks",
      "Resolution history for audit and coaching",
    ],
    icon: "Headphones",
    accent: "#B91C1C",
    modules: [
      {
        name: "Helpdesk",
        summary: "Support tickets, SLAs and escalation.",
        capabilities: ["Ticket intake", "Priority & queue", "SLA timers", "Knowledge / resolution notes"],
      },
    ],
  },
];

export const NEXUS_LIVE_EVENTS = [
  { product: "Travel", text: "Air ticket issued · DOH–DXB · POS Al Sadd" },
  { product: "Finance", text: "Sales voucher posted · QAR 4,820 · Company: RTT" },
  { product: "CRM", text: "Corporate opportunity moved to Proposal" },
  { product: "Fleet", text: "Airport transfer dispatched · HIA T1" },
  { product: "Hospitality", text: "Guest checked in · reservation confirmed" },
  { product: "HRMS", text: "Leave request approved · Branch West Bay" },
  { product: "Helpdesk", text: "Priority ticket closed · B2B login issue" },
  { product: "Real Estate", text: "Lease renewal created · Unit 12B" },
  { product: "Procurement", text: "Purchase order released · vendor confirmed" },
  { product: "Inventory", text: "Stock transfer completed · WH-01 → WH-03" },
] as const;

export const NEXUS_KPIS = [
  { label: "Licensed products", value: 13, suffix: "" },
  { label: "Active modules", value: 18, suffix: "" },
  { label: "Bookings today", value: 146, suffix: "" },
  { label: "Operating companies", value: 8, suffix: "" },
] as const;

export const NEXUS_PLATFORM_STEPS = [
  {
    title: "Establish the holding structure",
    body: "Create the tenant, register companies and branches, and define departments, designations and access roles in Administration. This becomes the shared directory every product reads from.",
  },
  {
    title: "License products by business need",
    body: "Grant Module Access for Travel, Finance, Real Estate, HRMS, CRM and the rest per company. Channel modules such as B2B, B2C, CBT and API are licensed without forcing them into the administration menu.",
  },
  {
    title: "Operate across connected businesses",
    body: "Day-to-day work — bookings, vouchers, leases, fleet jobs and service tickets — runs in the licensed products while group users keep one sign-in, one org model and one audit trail.",
  },
] as const;
