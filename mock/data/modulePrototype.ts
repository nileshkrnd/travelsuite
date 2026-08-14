import type { KpiFormat } from "@/config/dashboardWidgets";
import type { CurrencyCode, Money } from "@/types";

export interface ModulePrototypeKpi {
  label: string;
  icon: string;
  value: number | Money;
  format: KpiFormat;
}

export interface ModulePrototypeRow {
  id: string;
  reference: string;
  name: string;
  status: string;
  owner: string;
  amount: number | Money;
  updated: string;
}

export interface ModulePrototypeChartPoint {
  label: string;
  value: number;
}

export interface ModulePrototypeData {
  kpis: ModulePrototypeKpi[];
  rows: ModulePrototypeRow[];
  chart: ModulePrototypeChartPoint[];
  chartType: "bar" | "area";
  amountColumnLabel: string;
  amountIsMoney: boolean;
}

const STATUSES = ["Active", "Pending", "Confirmed", "Cancelled", "On Hold", "Draft", "Completed"] as const;

const OWNERS = [
  "Sarah Mitchell",
  "James Chen",
  "Priya Sharma",
  "Michael O'Brien",
  "Fatima Al-Rashid",
  "David Okonkwo",
  "Emma Laurent",
  "Raj Patel",
  "Sophie Becker",
  "Carlos Mendez",
];

const ENTITIES = [
  "Acme Travel Group",
  "Global Horizons Ltd",
  "Sunrise Tours",
  "Metro Business Travel",
  "Pacific Voyages",
  "Elite Corporate CBT",
  "Heritage Holidays",
  "Skyline Aviation Desk",
  "Coastal Resorts",
  "Urban Express Transfers",
];

const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "AED"];

const KPI_TEMPLATES: { label: string; icon: string; format: KpiFormat; min: number; max: number }[] = [
  { label: "Total records", icon: "Layers", format: "number", min: 120, max: 4800 },
  { label: "This month", icon: "TrendingUp", format: "number", min: 18, max: 320 },
  { label: "Pending action", icon: "Hourglass", format: "number", min: 3, max: 48 },
  { label: "Total value", icon: "Wallet", format: "money", min: 12000, max: 890000 },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function createSeededRandom(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (Math.imul(31, state) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

function intBetween(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function moneyValue(rand: () => number, min: number, max: number): Money {
  return {
    value: intBetween(rand, min, max),
    currencyCode: pick(rand, CURRENCIES),
  };
}

function formatReference(rand: () => number, moduleKey: string, index: number): string {
  const prefix = moduleKey.replace(/([A-Z])/g, "-$1").split("-").filter(Boolean).slice(0, 2).join("").slice(0, 4).toUpperCase() || "REF";
  const year = 2025 + Math.floor(rand() * 2);
  return `${prefix}-${year}-${String(index + 1).padStart(4, "0")}`;
}

function formatUpdated(rand: () => number): string {
  const daysAgo = intBetween(rand, 0, 45);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

/** Domain-tuned prototypes for HR / Admin HR masters (seeded, still mock). */
const HR_PROTOTYPE_NAMES: Record<string, string[]> = {
  hrmsDashboard: ["Headcount snapshot", "Attrition watch", "Open positions", "Leave liability"],
  hrmsEmployees: [
    "Aisha Rahman — Sales",
    "Omar Khalid — Operations",
    "Priya Nair — Finance",
    "James Cole — Mid Office",
    "Layla Hassan — HR",
  ],
  attendanceDaily: ["Present — Dubai HQ", "Late — Branch DXB2", "WFH — Sales", "Absent — Ops"],
  attendanceRoster: ["Morning shift — Front desk", "Evening — Ticketing", "Roster week 30", "Weekend cover"],
  attendanceRegularization: ["Missed punch — Aisha", "OT claim — Omar", "Shift swap — Priya"],
  leaveRequests: ["Annual leave — Aisha", "Sick leave — Omar", "Maternity — Layla", "Unpaid — James"],
  leaveBalance: ["Annual 12.5 days", "Sick 4 days", "Carry forward 2", "Comp-off 1"],
  leavePolicy: ["Annual leave policy 2026", "Sick leave UAE", "Probation leave rule"],
  payrollStructure: ["Executive CTC band", "Operations basic+", "Sales incentive pack"],
  payrollRun: ["July 2026 payroll", "June 2026 payroll", "Off-cycle bonus run"],
  payrollLoans: ["Salary advance — Omar", "Loan EMI — Priya", "Travel advance — James"],
  recruitmentJobs: ["Ticketing executive", "Finance accountant", "Sales consultant"],
  recruitmentCandidates: ["Candidate — Sara Ali", "Candidate — Rohan Mehta", "Candidate — Nora Berg"],
  recruitmentInterviews: ["Round 1 — Sara Ali", "Final — Rohan Mehta", "HR screen — Nora"],
  performanceGoals: ["Q3 booking target", "CSAT ≥ 90%", "Cost per ticket ↓ 5%"],
  performanceAppraisals: ["Mid-year 2026 — Aisha", "Probation review — Omar"],
  letters: ["Offer letter draft", "Experience certificate", "Warning letter template"],
  employeeDocuments: ["Passport — Aisha", "Visa — Omar", "Contract — Priya"],
  resignation: ["Resignation — James Cole", "Notice period tracker"],
  gratuity: ["Gratuity estimate — 5 yrs", "EOSB accrual July"],
  settlement: ["FnF — James Cole", "Clearance checklist"],
  hrmsGrade: ["G1 — Junior", "G3 — Executive", "G5 — Manager", "G7 — Director"],
  hrmsShift: ["09:00–18:00 Standard", "14:00–23:00 Evening", "Flex core hours"],
  hrmsLeaveType: ["Annual", "Sick", "Maternity", "Hajj", "Unpaid"],
  hrmsHolidayCalendar: ["UAE 2026 public holidays", "Company off — Founders Day"],
  hrmsSalaryComponent: ["Basic", "Housing", "Transport", "Ticket allowance", "Incentive"],
  hrmsDocumentType: ["Passport", "Emirates ID", "Visa", "Contract", "Educational cert"],
};

const HR_KPI_SETS: Record<
  string,
  { label: string; icon: string; format: KpiFormat; min: number; max: number }[]
> = {
  attendanceDaily: [
    { label: "Present today", icon: "CheckCircle2", format: "number", min: 80, max: 220 },
    { label: "Late", icon: "Hourglass", format: "number", min: 2, max: 18 },
    { label: "Absent", icon: "XCircle", format: "number", min: 0, max: 12 },
    { label: "On leave", icon: "PalmTree", format: "number", min: 3, max: 25 },
  ],
  leaveRequests: [
    { label: "Open requests", icon: "FilePlus", format: "number", min: 4, max: 40 },
    { label: "Approved MTD", icon: "CheckCircle2", format: "number", min: 10, max: 80 },
    { label: "Avg days", icon: "CalendarDays", format: "number", min: 1, max: 8 },
    { label: "Pending managers", icon: "Hourglass", format: "number", min: 1, max: 15 },
  ],
  payrollRun: [
    { label: "Employees in run", icon: "Users", format: "number", min: 90, max: 320 },
    { label: "Gross payroll", icon: "Wallet", format: "money", min: 180000, max: 920000 },
    { label: "Deductions", icon: "CreditCard", format: "money", min: 12000, max: 90000 },
    { label: "Net pay", icon: "BadgeDollarSign", format: "money", min: 150000, max: 850000 },
  ],
  recruitmentJobs: [
    { label: "Open roles", icon: "Briefcase", format: "number", min: 3, max: 24 },
    { label: "Candidates", icon: "UserCheck", format: "number", min: 20, max: 180 },
    { label: "Interviews", icon: "Users", format: "number", min: 5, max: 40 },
    { label: "Offers out", icon: "FileSignature", format: "number", min: 1, max: 12 },
  ],
  hrmsEmployees: [
    { label: "Active staff", icon: "Users", format: "number", min: 100, max: 420 },
    { label: "New joiners MTD", icon: "UserPlus", format: "number", min: 2, max: 18 },
    { label: "Exits MTD", icon: "LogOut", format: "number", min: 0, max: 8 },
    { label: "Contractors", icon: "UserCog", format: "number", min: 5, max: 40 },
  ],
};

const HR_STATUSES = ["Active", "Pending", "Approved", "Rejected", "Draft", "Completed", "On Hold"] as const;

/** Domain-tuned prototypes for the Procurement module (seeded, still mock). */
const PROCUREMENT_PROTOTYPE_NAMES: Record<string, string[]> = {
  procurementDashboard: [
    "Open requisitions",
    "Active RFQs awaiting quotes",
    "POs pending approval",
    "Overdue deliveries",
    "Vendor onboarding in progress",
    "Contracts renewing this quarter",
    "Budget utilization — Q3",
    "Top spend category — IT Equipment",
  ],
  purchaseRequisitions: [
    "Laptops — IT Department",
    "Office Supplies — Dubai HQ",
    "Marketing Collateral — Sales",
    "Catering Services — Annual Conference",
    "Software Licenses — Finance",
    "Furniture — New Branch Setup",
    "Safety Equipment — Warehouse",
    "Travel Kits — Field Staff",
    "Printer Toner — Admin",
    "Ergonomic Chairs — HR",
  ],
  rfq: [
    "RFQ — Corporate Laptops (50 units)",
    "RFQ — Hotel Room Block Q3 2026",
    "RFQ — Ground Transportation Contract",
    "RFQ — Office Stationery Annual Supply",
    "RFQ — IT Support Services",
    "RFQ — Print & Signage",
    "RFQ — Facilities Cleaning Services",
    "RFQ — Courier & Logistics",
  ],
  procurementOrders: [
    "PO — Dell Technologies FZE",
    "PO — Emirates Office Supplies",
    "PO — Gulf IT Solutions",
    "PO — Al Futtaim Furniture",
    "PO — Skyline Print Services",
    "PO — Continental Catering Co",
    "PO — SecureLogix Systems",
    "PO — Prime Facilities Management",
  ],
  vendors: [
    "Dell Technologies FZE",
    "Emirates Office Supplies",
    "Gulf IT Solutions",
    "Al Futtaim Furniture",
    "Skyline Print Services",
    "Continental Catering Co",
    "SecureLogix Systems",
    "Prime Facilities Management",
    "Nova Logistics & Courier",
    "Bright Office Interiors",
  ],
  goodsReceipt: [
    "GRN — Dell Technologies Delivery",
    "GRN — Furniture Batch 2",
    "GRN — Stationery Restock",
    "GRN — IT Equipment Q3",
    "GRN — Catering Supplies",
    "GRN — Facilities Consumables",
  ],
  vendorInvoices: [
    "Invoice — Dell Technologies #INV-4521",
    "Invoice — Gulf IT Solutions #INV-3390",
    "Invoice — Al Futtaim Furniture #INV-2201",
    "Invoice — Skyline Print Services #INV-1187",
    "Invoice — Continental Catering Co #INV-5502",
    "Invoice — SecureLogix Systems #INV-3765",
  ],
  procurementContracts: [
    "IT Support Annual — Gulf IT Solutions",
    "Office Supplies MSA — Emirates Office Supplies",
    "Facilities Management — Prime Facilities",
    "Courier & Logistics — Nova Logistics",
    "Print & Signage — Skyline Print Services",
  ],
  procurementReports: [
    "Spend by Category",
    "Vendor Performance Scorecard",
    "Savings Realized — YTD",
    "Contract Compliance Report",
    "Requisition Cycle Time Analysis",
    "Maverick Spend Report",
  ],
};

const PROCUREMENT_KPI_SETS: Record<
  string,
  { label: string; icon: string; format: KpiFormat; min: number; max: number }[]
> = {
  procurementDashboard: [
    { label: "Open requisitions", icon: "ClipboardCheck", format: "number", min: 8, max: 60 },
    { label: "Active RFQs", icon: "FileSignature", format: "number", min: 3, max: 25 },
    { label: "POs this month", icon: "ShoppingCart", format: "number", min: 15, max: 120 },
    { label: "Total spend MTD", icon: "Wallet", format: "money", min: 45000, max: 620000 },
  ],
  purchaseRequisitions: [
    { label: "Open requisitions", icon: "ClipboardCheck", format: "number", min: 10, max: 70 },
    { label: "Pending approval", icon: "Hourglass", format: "number", min: 3, max: 30 },
    { label: "Approved MTD", icon: "CheckCircle2", format: "number", min: 15, max: 90 },
    { label: "Requested value", icon: "Wallet", format: "money", min: 20000, max: 380000 },
  ],
  rfq: [
    { label: "Active RFQs", icon: "FileSignature", format: "number", min: 4, max: 22 },
    { label: "Vendors invited", icon: "Users2", format: "number", min: 12, max: 60 },
    { label: "Quotes received", icon: "FileText", format: "number", min: 8, max: 45 },
    { label: "Avg savings", icon: "TrendingDown", format: "percent", min: 4, max: 22 },
  ],
  procurementOrders: [
    { label: "Open POs", icon: "ShoppingCart", format: "number", min: 12, max: 80 },
    { label: "Awaiting delivery", icon: "Truck", format: "number", min: 5, max: 40 },
    { label: "Closed MTD", icon: "CheckCircle2", format: "number", min: 10, max: 65 },
    { label: "PO value MTD", icon: "Wallet", format: "money", min: 60000, max: 540000 },
  ],
  vendors: [
    { label: "Active vendors", icon: "Store", format: "number", min: 40, max: 220 },
    { label: "Onboarding", icon: "UserPlus", format: "number", min: 2, max: 15 },
    { label: "Avg rating", icon: "ShieldCheck", format: "percent", min: 70, max: 98 },
    { label: "YTD spend", icon: "Wallet", format: "money", min: 180000, max: 1450000 },
  ],
  goodsReceipt: [
    { label: "Receipts this month", icon: "Truck", format: "number", min: 10, max: 65 },
    { label: "Pending inspection", icon: "Hourglass", format: "number", min: 1, max: 18 },
    { label: "Discrepancies", icon: "XCircle", format: "number", min: 0, max: 9 },
    { label: "Received value", icon: "Wallet", format: "money", min: 35000, max: 410000 },
  ],
  vendorInvoices: [
    { label: "Open invoices", icon: "Receipt", format: "number", min: 8, max: 55 },
    { label: "Pending match", icon: "Hourglass", format: "number", min: 2, max: 20 },
    { label: "Paid MTD", icon: "CheckCircle2", format: "number", min: 15, max: 80 },
    { label: "Invoice value", icon: "Wallet", format: "money", min: 40000, max: 480000 },
  ],
  procurementContracts: [
    { label: "Active contracts", icon: "FileSignature", format: "number", min: 8, max: 45 },
    { label: "Renewing this quarter", icon: "CalendarDays", format: "number", min: 1, max: 12 },
    { label: "Avg compliance", icon: "ShieldCheck", format: "percent", min: 75, max: 99 },
    { label: "Contract value", icon: "Wallet", format: "money", min: 90000, max: 980000 },
  ],
  procurementReports: [
    { label: "Reports generated", icon: "FileText", format: "number", min: 10, max: 60 },
    { label: "Savings identified", icon: "TrendingDown", format: "money", min: 15000, max: 210000 },
    { label: "Avg cycle time (days)", icon: "Clock", format: "number", min: 2, max: 14 },
    { label: "Compliance rate", icon: "ShieldCheck", format: "percent", min: 78, max: 97 },
  ],
};

const PROCUREMENT_STATUSES = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Sent to Vendor",
  "Quoted",
  "Ordered",
  "Partially Received",
  "Received",
  "Invoiced",
  "Paid",
  "Rejected",
  "Cancelled",
] as const;

const PROCUREMENT_AMOUNT_LABELS: Record<string, string> = {
  procurementDashboard: "Value",
  purchaseRequisitions: "Requested Value",
  rfq: "Quoted Value",
  procurementOrders: "PO Value",
  vendors: "YTD Spend",
  goodsReceipt: "Received Value",
  vendorInvoices: "Invoice Amount",
  procurementContracts: "Contract Value",
  procurementReports: "Value",
};

/** Domain-tuned prototypes for Inventory Management (seeded, still mock). */
const INVENTORY_PROTOTYPE_NAMES: Record<string, string[]> = {
  inventoryDashboard: [
    "Stock value — Main WH",
    "Low stock alerts",
    "Open GRNs",
    "Transfers in transit",
    "Cycle count due",
    "Dead stock watchlist",
    "Reorder suggestions",
    "Aging stock > 90 days",
  ],
  warehouse: [
    "WH-DXB-01 — Dubai Main",
    "WH-DXB-02 — Dubai Branch Store",
    "WH-AUH-01 — Abu Dhabi Hub",
    "WH-SHJ-01 — Sharjah Transit",
    "WH-VIRT — Virtual / Drop-ship",
  ],
  products: [
    "SKU-TKT-001 — Airline ticket wallet",
    "SKU-BAG-120 — Branded cabin bag",
    "SKU-SIM-UAE — UAE tourist SIM",
    "SKU-INS-TRV — Travel insurance pack",
    "SKU-USB-PWR — USB power bank 20k",
    "SKU-MAP-CTY — City map booklet",
    "SKU-LPT-14 — Laptop 14\" business",
    "SKU-PRN-TN — Printer toner black",
  ],
  inventoryCategory: [
    "Travel Merchandise",
    "IT Hardware",
    "Office Consumables",
    "Ticketing Supplies",
    "Marketing Collateral",
    "Safety & First Aid",
  ],
  inventoryUom: ["Each (EA)", "Box (BOX)", "Pack (PK)", "Carton (CTN)", "Litre (L)", "Kilogram (KG)"],
  purchaseOrders: [
    "PO-INV-7841 — Emirates Office Supplies",
    "PO-INV-7842 — Gulf IT Solutions",
    "PO-INV-7843 — Travel Merch Co",
    "PO-INV-7844 — SecureLogix Systems",
    "PO-INV-7845 — Skyline Print Services",
    "PO-INV-7846 — Nova Logistics",
  ],
  stockIn: [
    "GRN-4521 — PO-INV-7841 partial",
    "GRN-4522 — PO-INV-7842 full",
    "GRN-4523 — Direct receipt — SIM cards",
    "GRN-4524 — Return to stock — cabin bags",
    "GRN-4525 — PO-INV-7845 print run",
  ],
  stockOut: [
    "ISS-2201 — Issue to Sales — Dubai HQ",
    "ISS-2202 — Issue to Events — Conference kits",
    "ISS-2203 — Write-off damaged toner",
    "ISS-2204 — Issue to Branch DXB2",
    "ISS-2205 — Customer complimentary pack",
  ],
  stockTransfers: [
    "TRF-1101 — Dubai Main → Abu Dhabi Hub",
    "TRF-1102 — Sharjah Transit → Dubai Main",
    "TRF-1103 — Dubai Branch → Dubai Main",
    "TRF-1104 — Virtual → Dubai Main (drop-ship)",
  ],
  stockAdjustment: [
    "ADJ-901 — Cycle count variance — toner",
    "ADJ-902 — Damage write-down — bags",
    "ADJ-903 — Found stock — SIM packs",
    "ADJ-904 — UOM conversion correction",
  ],
  stockTake: [
    "STK-JUL-01 — Full count Dubai Main",
    "STK-JUL-02 — Spot count Travel Merch",
    "STK-JUL-03 — Cycle count IT Hardware",
    "STK-JUL-04 — Year-end count Abu Dhabi",
  ],
  stockOnHand: [
    "Airline ticket wallet — Dubai Main",
    "Branded cabin bag — Abu Dhabi Hub",
    "UAE tourist SIM — Dubai Branch",
    "USB power bank — Sharjah Transit",
    "Printer toner black — Dubai Main",
  ],
  stockLedger: [
    "SKU-TKT-001 — GRN in",
    "SKU-BAG-120 — Transfer out",
    "SKU-SIM-UAE — Issue to Sales",
    "SKU-PRN-TN — Adjustment −2",
    "SKU-USB-PWR — Stock take confirm",
  ],
  lowStock: [
    "Printer toner black — below min",
    "UAE tourist SIM — at reorder point",
    "USB power bank — critical",
    "City map booklet — below safety stock",
  ],
};

const INVENTORY_KPI_SETS: Record<
  string,
  { label: string; icon: string; format: KpiFormat; min: number; max: number }[]
> = {
  inventoryDashboard: [
    { label: "Stock value", icon: "Wallet", format: "money", min: 120000, max: 980000 },
    { label: "SKU on hand", icon: "Package", format: "number", min: 80, max: 420 },
    { label: "Low stock", icon: "Hourglass", format: "number", min: 3, max: 28 },
    { label: "Open transfers", icon: "ArrowLeftRight", format: "number", min: 1, max: 18 },
  ],
  warehouse: [
    { label: "Warehouses", icon: "Warehouse", format: "number", min: 3, max: 12 },
    { label: "Active locations", icon: "Store", format: "number", min: 8, max: 40 },
    { label: "SKUs stocked", icon: "Boxes", format: "number", min: 60, max: 350 },
    { label: "Capacity used", icon: "Scale", format: "percent", min: 45, max: 92 },
  ],
  products: [
    { label: "Active SKUs", icon: "Package", format: "number", min: 90, max: 480 },
    { label: "Inactive / obsolete", icon: "XCircle", format: "number", min: 2, max: 35 },
    { label: "Avg unit cost", icon: "Wallet", format: "money", min: 15, max: 420 },
    { label: "Categories", icon: "Tags", format: "number", min: 5, max: 24 },
  ],
  inventoryCategory: [
    { label: "Categories", icon: "Tags", format: "number", min: 6, max: 30 },
    { label: "SKUs mapped", icon: "Package", format: "number", min: 80, max: 400 },
    { label: "Uncategorized", icon: "Hourglass", format: "number", min: 0, max: 18 },
    { label: "Active", icon: "CheckCircle2", format: "number", min: 5, max: 28 },
  ],
  inventoryUom: [
    { label: "UOM codes", icon: "ListOrdered", format: "number", min: 6, max: 40 },
    { label: "Base UOMs", icon: "Scale", format: "number", min: 3, max: 12 },
    { label: "Conversions", icon: "RefreshCw", format: "number", min: 4, max: 25 },
    { label: "In use", icon: "CheckCircle2", format: "number", min: 5, max: 35 },
  ],
  purchaseOrders: [
    { label: "Open POs", icon: "ShoppingCart", format: "number", min: 8, max: 55 },
    { label: "Awaiting GRN", icon: "Truck", format: "number", min: 3, max: 30 },
    { label: "Closed MTD", icon: "CheckCircle2", format: "number", min: 10, max: 60 },
    { label: "PO value MTD", icon: "Wallet", format: "money", min: 25000, max: 380000 },
  ],
  stockIn: [
    { label: "GRNs MTD", icon: "ArrowDownToLine", format: "number", min: 12, max: 70 },
    { label: "Pending QC", icon: "Hourglass", format: "number", min: 1, max: 15 },
    { label: "Qty received", icon: "Boxes", format: "number", min: 200, max: 4500 },
    { label: "Received value", icon: "Wallet", format: "money", min: 18000, max: 320000 },
  ],
  stockOut: [
    { label: "Issues MTD", icon: "ArrowUpFromLine", format: "number", min: 15, max: 90 },
    { label: "Qty issued", icon: "Boxes", format: "number", min: 150, max: 3200 },
    { label: "Write-offs", icon: "XCircle", format: "number", min: 0, max: 12 },
    { label: "Issue value", icon: "Wallet", format: "money", min: 8000, max: 180000 },
  ],
  stockTransfers: [
    { label: "In transit", icon: "ArrowLeftRight", format: "number", min: 2, max: 20 },
    { label: "Completed MTD", icon: "CheckCircle2", format: "number", min: 8, max: 45 },
    { label: "Lines moved", icon: "Package", format: "number", min: 40, max: 400 },
    { label: "Transfer value", icon: "Wallet", format: "money", min: 5000, max: 120000 },
  ],
  stockAdjustment: [
    { label: "Adjustments MTD", icon: "RefreshCw", format: "number", min: 3, max: 28 },
    { label: "Qty variance", icon: "Scale", format: "number", min: 5, max: 120 },
    { label: "Positive adj.", icon: "CheckCircle2", format: "number", min: 1, max: 15 },
    { label: "Adj. value", icon: "Wallet", format: "money", min: 500, max: 45000 },
  ],
  stockTake: [
    { label: "Open counts", icon: "ClipboardCheck", format: "number", min: 1, max: 12 },
    { label: "Lines counted", icon: "ListOrdered", format: "number", min: 50, max: 800 },
    { label: "Variance lines", icon: "Hourglass", format: "number", min: 0, max: 40 },
    { label: "Accuracy", icon: "ShieldCheck", format: "percent", min: 88, max: 99 },
  ],
  stockOnHand: [
    { label: "On-hand qty", icon: "Package", format: "number", min: 500, max: 12000 },
    { label: "Stock value", icon: "Wallet", format: "money", min: 80000, max: 750000 },
    { label: "Warehouses", icon: "Warehouse", format: "number", min: 3, max: 10 },
    { label: "Zero stock SKUs", icon: "XCircle", format: "number", min: 5, max: 60 },
  ],
  stockLedger: [
    { label: "Movements MTD", icon: "BookMarked", format: "number", min: 80, max: 600 },
    { label: "In qty", icon: "ArrowDownToLine", format: "number", min: 200, max: 5000 },
    { label: "Out qty", icon: "ArrowUpFromLine", format: "number", min: 180, max: 4800 },
    { label: "Net change", icon: "Scale", format: "number", min: -200, max: 800 },
  ],
  lowStock: [
    { label: "Below minimum", icon: "Hourglass", format: "number", min: 4, max: 35 },
    { label: "At reorder", icon: "ShoppingCart", format: "number", min: 2, max: 20 },
    { label: "Critical", icon: "XCircle", format: "number", min: 0, max: 10 },
    { label: "Est. restock value", icon: "Wallet", format: "money", min: 3000, max: 85000 },
  ],
};

const INVENTORY_STATUSES = [
  "Draft",
  "Open",
  "In Transit",
  "Received",
  "Issued",
  "Posted",
  "Counted",
  "Variance",
  "Closed",
  "Cancelled",
  "Active",
  "Inactive",
] as const;

const INVENTORY_AMOUNT_LABELS: Record<string, string> = {
  inventoryDashboard: "Value",
  warehouse: "Stock Value",
  products: "Unit Cost",
  inventoryCategory: "SKU Count",
  inventoryUom: "Conversions",
  purchaseOrders: "PO Value",
  stockIn: "Received Value",
  stockOut: "Issue Value",
  stockTransfers: "Transfer Value",
  stockAdjustment: "Adj. Value",
  stockTake: "Variance Value",
  stockOnHand: "On-Hand Value",
  stockLedger: "Movement Value",
  lowStock: "Reorder Value",
};

const INVENTORY_COUNT_MODULES = new Set([
  "inventoryCategory",
  "inventoryUom",
  "stockLedger",
]);

/** Domain-tuned prototypes for the Extranet (supplier self-service) module (seeded, still mock). */
const PROPERTIES = [
  "Grand Plaza Hotel — Dubai Marina",
  "Marina Bay Resort — Abu Dhabi",
  "Desert Oasis Villas — Al Ain",
  "Skyline Business Hotel — Downtown Dubai",
  "Coral Beach Resort — Ras Al Khaimah",
  "Palm Grove Suites — Dubai",
  "Al Waha Heritage Hotel — Sharjah",
  "Emerald City Hotel — Dubai",
];

const EXTRANET_PROTOTYPE_NAMES: Record<string, string[]> = {
  extranetDashboard: [
    "Live properties",
    "Rooms available today",
    "Bookings this month",
    "Stop sales active",
    "Rate parity alerts",
    "Reviews pending response",
    "Channel sync issues",
    "Contracts expiring soon",
  ],
  extranetSelectProperty: PROPERTIES,
  contracts: [
    "Rate Contract 2026 — Grand Plaza Hotel",
    "Allotment Agreement — Marina Bay Resort",
    "Net Rate Contract — Desert Oasis Villas",
    "Preferred Partner Agreement — Skyline Business Hotel",
    "Seasonal Contract Q3 — Coral Beach Resort",
    "Group Booking Contract — Palm Grove Suites",
  ],
  extranetInventory: [
    "Deluxe Room — Grand Plaza Hotel",
    "Sea View Suite — Marina Bay Resort",
    "Villa with Pool — Desert Oasis Villas",
    "Executive Room — Skyline Business Hotel",
    "Beachfront Bungalow — Coral Beach Resort",
    "Junior Suite — Palm Grove Suites",
  ],
  rates: [
    "Best Available Rate — Grand Plaza Hotel",
    "Non-Refundable Rate — Marina Bay Resort",
    "Early Bird Rate — Desert Oasis Villas",
    "Corporate Rate — Skyline Business Hotel",
    "Long Stay Rate — Coral Beach Resort",
    "Package Rate (BB) — Palm Grove Suites",
  ],
  supplement: [
    "Extra Bed — Grand Plaza Hotel",
    "Airport Transfer — Marina Bay Resort",
    "Half Board Upgrade — Desert Oasis Villas",
    "Late Checkout — Skyline Business Hotel",
    "Spa Package — Coral Beach Resort",
    "Gala Dinner — Palm Grove Suites",
  ],
  extranetAvailability: [
    "ARI Sync — Deluxe Room — Grand Plaza Hotel",
    "ARI Sync — Sea View Suite — Marina Bay Resort",
    "ARI Sync — Villa with Pool — Desert Oasis Villas",
    "ARI Sync — Executive Room — Skyline Business Hotel",
    "ARI Sync — Beachfront Bungalow — Coral Beach Resort",
    "ARI Sync — Junior Suite — Palm Grove Suites",
  ],
  promotions: [
    "Early Bird 2026 — Grand Plaza Hotel",
    "Summer Sale — Marina Bay Resort",
    "Stay 3 Pay 2 — Desert Oasis Villas",
    "Weekend Getaway — Skyline Business Hotel",
    "Honeymoon Package — Coral Beach Resort",
    "Long Weekend Offer — Palm Grove Suites",
  ],
  stopSales: [
    "Stop Sale — Deluxe Room — Grand Plaza Hotel",
    "Stop Sale — Sea View Suite — Marina Bay Resort",
    "Stop Sale — Villa with Pool — Desert Oasis Villas",
    "Stop Sale — Executive Room — Skyline Business Hotel",
    "Stop Sale — All Rooms — Coral Beach Resort",
  ],
  blackoutDates: [
    "New Year's Eve 2026 — Grand Plaza Hotel",
    "National Day — Marina Bay Resort",
    "Ramadan Peak — Desert Oasis Villas",
    "Eid Al Fitr — Skyline Business Hotel",
    "Summer Peak — Coral Beach Resort",
  ],
  extranetConnectivity: [
    "Booking.com — Grand Plaza Hotel",
    "Expedia — Marina Bay Resort",
    "Agoda — Desert Oasis Villas",
    "Airbnb — Skyline Business Hotel",
    "Hotels.com — Coral Beach Resort",
    "Trip.com — Palm Grove Suites",
  ],
  extranetReviews: [
    "Guest review — Grand Plaza Hotel",
    "Guest review — Marina Bay Resort",
    "Guest review — Desert Oasis Villas",
    "Guest review — Skyline Business Hotel",
    "Guest review — Coral Beach Resort",
    "Guest review — Palm Grove Suites",
  ],
  extranetBookings: [
    "Booking — Grand Plaza Hotel",
    "Booking — Marina Bay Resort",
    "Booking — Desert Oasis Villas",
    "Booking — Skyline Business Hotel",
    "Booking — Coral Beach Resort",
    "Booking — Palm Grove Suites",
  ],
  extranetReports: [
    "Occupancy Report",
    "RevPAR Analysis",
    "Channel Performance Report",
    "Rate Parity Report",
    "Booking Pace Report",
    "Guest Review Summary",
  ],
};

const EXTRANET_KPI_SETS: Record<
  string,
  { label: string; icon: string; format: KpiFormat; min: number; max: number }[]
> = {
  extranetDashboard: [
    { label: "Live properties", icon: "Home", format: "number", min: 8, max: 45 },
    { label: "Rooms available today", icon: "BedDouble", format: "number", min: 120, max: 980 },
    { label: "Bookings this month", icon: "CalendarCheck", format: "number", min: 40, max: 320 },
    { label: "Occupancy rate", icon: "TrendingUp", format: "percent", min: 55, max: 92 },
  ],
  extranetSelectProperty: [
    { label: "Active properties", icon: "Home", format: "number", min: 6, max: 40 },
    { label: "Pending approval", icon: "Hourglass", format: "number", min: 0, max: 6 },
    { label: "Total rooms", icon: "BedDouble", format: "number", min: 80, max: 650 },
    { label: "Guest satisfaction", icon: "Star", format: "percent", min: 78, max: 97 },
  ],
  contracts: [
    { label: "Active contracts", icon: "FileSignature", format: "number", min: 6, max: 40 },
    { label: "Expiring this quarter", icon: "CalendarDays", format: "number", min: 1, max: 10 },
    { label: "Avg commission", icon: "Coins", format: "percent", min: 8, max: 22 },
    { label: "Contracted value", icon: "Wallet", format: "money", min: 80000, max: 950000 },
  ],
  extranetInventory: [
    { label: "Room types listed", icon: "BedDouble", format: "number", min: 10, max: 90 },
    { label: "Units active", icon: "Boxes", format: "number", min: 40, max: 500 },
    { label: "Out of service", icon: "XCircle", format: "number", min: 0, max: 12 },
    { label: "Inventory value", icon: "Wallet", format: "money", min: 60000, max: 720000 },
  ],
  rates: [
    { label: "Active rate plans", icon: "BadgeDollarSign", format: "number", min: 8, max: 60 },
    { label: "Avg nightly rate", icon: "Wallet", format: "money", min: 80, max: 950 },
    { label: "Rate parity issues", icon: "XCircle", format: "number", min: 0, max: 8 },
    { label: "Rate changes this week", icon: "RefreshCw", format: "number", min: 3, max: 40 },
  ],
  supplement: [
    { label: "Active supplements", icon: "PlusCircle", format: "number", min: 4, max: 35 },
    { label: "Bookings with add-ons", icon: "ShoppingBag", format: "number", min: 8, max: 120 },
    { label: "Avg supplement value", icon: "Wallet", format: "money", min: 15, max: 180 },
    { label: "Supplement revenue", icon: "TrendingUp", format: "money", min: 8000, max: 95000 },
  ],
  extranetAvailability: [
    { label: "Nights synced today", icon: "RefreshCw", format: "number", min: 200, max: 2400 },
    { label: "Sync failures", icon: "XCircle", format: "number", min: 0, max: 9 },
    { label: "Fully booked nights (30d)", icon: "CalendarX", format: "number", min: 2, max: 20 },
    { label: "Avg lead time (days)", icon: "Clock", format: "number", min: 5, max: 45 },
  ],
  promotions: [
    { label: "Active promotions", icon: "Megaphone", format: "number", min: 3, max: 30 },
    { label: "Bookings via promo", icon: "ShoppingBag", format: "number", min: 10, max: 140 },
    { label: "Avg discount", icon: "TrendingDown", format: "percent", min: 8, max: 30 },
    { label: "Promo revenue", icon: "Wallet", format: "money", min: 25000, max: 320000 },
  ],
  stopSales: [
    { label: "Active stop sales", icon: "Ban", format: "number", min: 1, max: 20 },
    { label: "Rooms affected", icon: "BedDouble", format: "number", min: 3, max: 80 },
    { label: "Properties affected", icon: "Home", format: "number", min: 1, max: 15 },
    { label: "Avg duration (days)", icon: "Clock", format: "number", min: 1, max: 14 },
  ],
  blackoutDates: [
    { label: "Upcoming blackouts", icon: "CalendarOff", format: "number", min: 2, max: 18 },
    { label: "Properties affected", icon: "Home", format: "number", min: 2, max: 20 },
    { label: "Peak season blocks", icon: "CalendarDays", format: "number", min: 1, max: 8 },
    { label: "Days blocked (90d)", icon: "Clock", format: "number", min: 5, max: 60 },
  ],
  extranetConnectivity: [
    { label: "Connected channels", icon: "Workflow", format: "number", min: 3, max: 12 },
    { label: "Sync errors today", icon: "XCircle", format: "number", min: 0, max: 15 },
    { label: "Bookings via channels", icon: "ShoppingCart", format: "number", min: 30, max: 320 },
    { label: "Channel commission", icon: "Wallet", format: "money", min: 15000, max: 210000 },
  ],
  extranetReviews: [
    { label: "Reviews this month", icon: "Star", format: "number", min: 10, max: 180 },
    { label: "Avg rating", icon: "Star", format: "percent", min: 72, max: 96 },
    { label: "Pending response", icon: "Hourglass", format: "number", min: 0, max: 15 },
    { label: "5-star reviews", icon: "CheckCircle2", format: "number", min: 20, max: 180 },
  ],
  extranetBookings: [
    { label: "Bookings this month", icon: "CalendarCheck", format: "number", min: 40, max: 320 },
    { label: "Confirmed", icon: "CheckCircle2", format: "number", min: 30, max: 280 },
    { label: "Cancelled", icon: "XCircle", format: "number", min: 2, max: 30 },
    { label: "Booking value", icon: "Wallet", format: "money", min: 45000, max: 620000 },
  ],
  extranetReports: [
    { label: "Reports generated", icon: "FileText", format: "number", min: 10, max: 60 },
    { label: "Occupancy rate", icon: "TrendingUp", format: "percent", min: 55, max: 92 },
    { label: "Avg RevPAR", icon: "Wallet", format: "money", min: 60, max: 420 },
    { label: "YoY growth", icon: "TrendingUp", format: "percent", min: 2, max: 18 },
  ],
};

const EXTRANET_STATUSES = [
  "Active",
  "Pending Review",
  "Live",
  "Suspended",
  "Draft",
  "Expired",
  "Under Negotiation",
  "Blocked",
] as const;

/** Extranet keys whose row amount is money-valued, with a domain-specific column label. */
const EXTRANET_MONEY_AMOUNT_LABELS: Record<string, string> = {
  extranetDashboard: "Value",
  extranetSelectProperty: "Room Revenue",
  contracts: "Contract Value",
  extranetInventory: "Inventory Value",
  rates: "Nightly Rate",
  supplement: "Supplement Price",
  promotions: "Promo Revenue",
  extranetConnectivity: "Channel Revenue",
  extranetBookings: "Booking Value",
  extranetReports: "Value",
};

/** Extranet keys whose row amount is a plain count (not money), with a domain-specific column label. */
const EXTRANET_COUNT_AMOUNT_LABELS: Record<string, string> = {
  extranetAvailability: "Nights",
  stopSales: "Rooms Blocked",
  blackoutDates: "Nights Blocked",
  extranetReviews: "Reviews",
};

export function getModulePrototypeData(moduleKey: string): ModulePrototypeData {
  const rand = createSeededRandom(moduleKey);
  const hrNames = HR_PROTOTYPE_NAMES[moduleKey];
  const procurementNames = PROCUREMENT_PROTOTYPE_NAMES[moduleKey];
  const inventoryNames = INVENTORY_PROTOTYPE_NAMES[moduleKey];
  const extranetNames = EXTRANET_PROTOTYPE_NAMES[moduleKey];
  const isHr = Boolean(hrNames);
  const isProcurement = Boolean(procurementNames);
  const isInventory = Boolean(inventoryNames);
  const isExtranet = Boolean(extranetNames);
  const domainNames = hrNames ?? procurementNames ?? inventoryNames ?? extranetNames;
  const moneyModules = new Set([
    "payrollRun",
    "payrollLoans",
    "payrollStructure",
    "gratuity",
    "settlement",
    "hrmsSalaryComponent",
  ]);
  const useMoney = isHr
    ? moneyModules.has(moduleKey)
    : isProcurement
      ? true
      : isInventory
        ? !INVENTORY_COUNT_MODULES.has(moduleKey)
        : isExtranet
          ? EXTRANET_MONEY_AMOUNT_LABELS[moduleKey] !== undefined
          : rand() > 0.35;
  const amountColumnLabel = useMoney
    ? (PROCUREMENT_AMOUNT_LABELS[moduleKey] ??
      INVENTORY_AMOUNT_LABELS[moduleKey] ??
      EXTRANET_MONEY_AMOUNT_LABELS[moduleKey] ??
      "Amount")
    : (INVENTORY_AMOUNT_LABELS[moduleKey] ??
      EXTRANET_COUNT_AMOUNT_LABELS[moduleKey] ??
      (moduleKey === "leaveBalance"
        ? "Days"
        : moduleKey.startsWith("attendance")
          ? "Hours"
          : "Count"));
  const chartType: "bar" | "area" = rand() > 0.5 ? "bar" : "area";
  const rowCount = domainNames ? Math.max(domainNames.length, 8) : 8 + Math.floor(rand() * 5);

  const kpiTemplates =
    HR_KPI_SETS[moduleKey] ??
    PROCUREMENT_KPI_SETS[moduleKey] ??
    INVENTORY_KPI_SETS[moduleKey] ??
    EXTRANET_KPI_SETS[moduleKey] ??
    KPI_TEMPLATES;
  const kpis: ModulePrototypeKpi[] = kpiTemplates.map((template, i) => {
    const value =
      template.format === "money"
        ? moneyValue(rand, template.min, template.max)
        : intBetween(rand, template.min, template.max) + (template.format === "percent" ? 0 : i * 7);

    return {
      label: template.label,
      icon: template.icon,
      format: template.format,
      value,
    };
  });

  const statuses = isHr
    ? HR_STATUSES
    : isProcurement
      ? PROCUREMENT_STATUSES
      : isInventory
        ? INVENTORY_STATUSES
        : isExtranet
          ? EXTRANET_STATUSES
          : STATUSES;
  const rows: ModulePrototypeRow[] = Array.from({ length: rowCount }, (_, i) => {
    const name = domainNames
      ? domainNames[i % domainNames.length]!
      : `${pick(rand, ENTITIES)} ${pick(rand, ["Booking", "Request", "Record", "Entry", "Case", "Item"])}`;
    return {
      id: `${moduleKey}-${i}`,
      reference: formatReference(rand, moduleKey, i),
      name,
      status: pick(rand, statuses),
      owner: pick(rand, OWNERS),
      amount: useMoney
        ? moneyValue(
            rand,
            isProcurement ? 2500 : isInventory ? 40 : isExtranet ? 300 : 250,
            isProcurement ? 185000 : isInventory ? 95000 : isExtranet ? 42000 : 18500
          )
        : intBetween(rand, moduleKey === "leaveBalance" ? 1 : 1, moduleKey.startsWith("attendance") ? 12 : 120),
      updated: formatUpdated(rand),
    };
  });

  const chartStart = intBetween(rand, 0, 6);
  const chart: ModulePrototypeChartPoint[] = Array.from({ length: 6 }, (_, i) => ({
    label: MONTHS[(chartStart + i) % 12]!,
    value: intBetween(rand, 12, 180),
  }));

  return {
    kpis,
    rows,
    chart,
    chartType,
    amountColumnLabel,
    amountIsMoney: useMoney,
  };
}
