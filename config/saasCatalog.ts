import { SAAS_BRAND } from "@/config/saasBrand";

export type SaasModuleId =
  | "hrms"
  | "midOffice"
  | "backOffice"
  | "operations"
  | "agency"
  | "corporate"
  | "accounts"
  | "extranet"
  | "sales"
  | "crm"
  | "assets"
  | "inventory"
  | "procurement"
  | "rentACar"
  | "carHire"
  | "fleetManagement"
  | "b2cOta"
  | "b2cMobile"
  | "b2bMobile"
  | "cbtMobile"
  | "propertyBuy"
  | "propertyRent"
  | "api"
  | "paymentGateway";

export type SaasPlanId = "starter" | "growth" | "enterprise";

export interface SaasModule {
  id: SaasModuleId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  features: string[];
  /** Monthly add-on price in USD when billed à la carte (Growth+). */
  monthlyPrice: number;
  category: "operations" | "partners" | "finance" | "mobility" | "digital" | "property" | "growth" | "platform";
}

export interface SaasPlan {
  id: SaasPlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  /** Included module IDs; "all" = every module. */
  includedModules: SaasModuleId[] | "all";
  maxUsers: number | "unlimited";
  highlights: string[];
  popular?: boolean;
}

export const SAAS_MODULES: SaasModule[] = [
  {
    id: "sales",
    name: "POS — Point of Sales",
    tagline: "Front-desk and counter bookings in one place",
    description:
      "Point of Sales for travel retail — walk-in and assisted bookings across flight, hotel, transfer, tours, visa, insurance, and more, with quotations, customers, and POS dashboards.",
    icon: "ShoppingBag",
    category: "operations",
    monthlyPrice: 149,
    features: [
      "POS booking desk & quotations",
      "Multi-product counter sales",
      "Customer profiles & history",
      "POS dashboards & targets",
    ],
  },
  {
    id: "backOffice",
    name: "Back Office",
    tagline: "Build packages and clear the booking queue",
    description:
      "Quotation and package builders plus end-to-end booking queues — pending, hold, confirmed, cancelled, and amendments in one operations hub.",
    icon: "Briefcase",
    category: "operations",
    monthlyPrice: 179,
    features: [
      "Quotation & package builders",
      "Booking queue workflows",
      "Hold / confirm / cancel states",
      "Amendment tracking",
    ],
  },
  {
    id: "midOffice",
    name: "Mid Office",
    tagline: "Ticketing and fulfillment under control",
    description:
      "Reservation queues, airline ticketing, hotel/flight/transfer/visa operations, QC, refunds, and reissues — the operational backbone after a sale.",
    icon: "Workflow",
    category: "operations",
    monthlyPrice: 179,
    features: [
      "Reservation & QC queues",
      "Flight ticketing ops",
      "Hotel & transfer fulfillment",
      "Refunds & reissues",
    ],
  },
  {
    id: "operations",
    name: "Operations",
    tagline: "Command center for day-to-day delivery",
    description:
      "Cross-desk operations hub — live queues, SLA timers, shift roster, exception handling, and escalation paths spanning POS, mid office, and back office.",
    icon: "LayoutDashboard",
    category: "operations",
    monthlyPrice: 129,
    features: [
      "Live operations dashboard",
      "SLA & exception tracking",
      "Shift / roster board",
      "Escalation & handoff rules",
    ],
  },
  {
    id: "hrms",
    name: "HRMS",
    tagline: "People operations across your group",
    description:
      "Attendance, leave, payroll, recruitment, performance, letters, gratuity, and full & final settlement — for travel companies and property teams alike.",
    icon: "Users",
    category: "operations",
    monthlyPrice: 99,
    features: [
      "Employee master & org chart",
      "Attendance & leave",
      "Payroll runs",
      "Recruitment & performance",
    ],
  },
  {
    id: "crm",
    name: "CRM Module",
    tagline: "Own every lead, opportunity, and ticket",
    description:
      "Unified CRM for travel and real-estate sales — pipeline, campaigns, customer 360, and support tickets with handoff into bookings or property deals.",
    icon: "HeartHandshake",
    category: "growth",
    monthlyPrice: 129,
    features: [
      "Leads & opportunity pipeline",
      "Campaigns & nurture",
      "Customer 360 view",
      "Support ticket desk",
    ],
  },
  {
    id: "agency",
    name: "Agency Module",
    tagline: "B2B portal for travel agents",
    description:
      "Give agencies and sub-agencies a branded portal to book, manage wallets, download statements, and run their own sales reports.",
    icon: "Network",
    category: "partners",
    monthlyPrice: 129,
    features: [
      "Agent & sub-agency hierarchy",
      "Self-service booking portal",
      "Wallet & credit limits",
      "Statements & commission reports",
    ],
  },
  {
    id: "corporate",
    name: "Corporate Module",
    tagline: "Corporate travel (CBT) with policy control",
    description:
      "Employee travel bookings, approval workflows, policy engines, and spend reports for corporates that need compliance without friction.",
    icon: "Briefcase",
    category: "partners",
    monthlyPrice: 149,
    features: [
      "Employee travel profiles",
      "Multi-level approvals",
      "Travel policy rules",
      "Spend & compliance reports",
    ],
  },
  {
    id: "extranet",
    name: "Extranet",
    tagline: "Supplier contracts, rates & inventory",
    description:
      "Let hoteliers, DMCs, and transport partners manage contracts, allotments, rates, promotions, stop-sales, and blackout dates.",
    icon: "Globe2",
    category: "partners",
    monthlyPrice: 159,
    features: [
      "Contract & allotment mgmt",
      "Dynamic rates & promotions",
      "Stop-sales & blackouts",
      "Supplier booking visibility",
    ],
  },
  {
    id: "accounts",
    name: "Finance Module",
    tagline: "Finance that matches how you sell",
    description:
      "Chart of accounts, journals, invoices, receipts, payments, bank reconciliation, and finance reports for multi-currency travel and property billing.",
    icon: "Landmark",
    category: "finance",
    monthlyPrice: 129,
    features: [
      "Chart of accounts & journals",
      "Invoices, receipts & payments",
      "Multi-currency ledgers",
      "Bank & finance reports",
    ],
  },
  {
    id: "assets",
    name: "Asset Management",
    tagline: "Track every laptop, vehicle, and fixture",
    description:
      "Asset register, categories, assignment to staff, maintenance schedules, and depreciation — so CapEx and OpEx stay auditable.",
    icon: "Laptop",
    category: "finance",
    monthlyPrice: 79,
    features: [
      "Asset register & categories",
      "Staff assignment",
      "Maintenance schedules",
      "Depreciation tracking",
    ],
  },
  {
    id: "inventory",
    name: "Inventory Management",
    tagline: "Warehouses, stock, and purchase orders",
    description:
      "Warehouse stock for merchandise, vouchers, and office supplies — with purchase orders, stock-in/out, and inter-branch transfers.",
    icon: "Warehouse",
    category: "finance",
    monthlyPrice: 89,
    features: [
      "Multi-warehouse stock",
      "Purchase orders",
      "Stock in / out",
      "Branch transfers",
    ],
  },
  {
    id: "procurement",
    name: "Procurement",
    tagline: "Source-to-order purchasing for the group",
    description:
      "Vendor master, purchase requisitions, purchase orders and goods receipt against PO — so spend is approved before it hits Finance and Inventory. Built for hospitality consumables, office supply and operational purchasing across companies and branches.",
    icon: "ShoppingCart",
    category: "finance",
    monthlyPrice: 99,
    features: [
      "Approved vendor catalogue",
      "PR / PO cycle with approval path",
      "Goods receipt against order",
      "Spend visibility by company & branch",
    ],
  },
  {
    id: "rentACar",
    name: "Rent A Car Module",
    tagline: "Fleet rental for agencies & corporates",
    description:
      "Manage a self-drive or chauffeur fleet — vehicle master, availability calendar, rental contracts, deposits, and return inspections.",
    icon: "CarFront",
    category: "mobility",
    monthlyPrice: 119,
    features: [
      "Fleet & vehicle master",
      "Availability calendar",
      "Rental contracts & deposits",
      "Return / damage checklist",
    ],
  },
  {
    id: "carHire",
    name: "Car Hire Module",
    tagline: "Chauffeur & transfer hire desk",
    description:
      "On-demand chauffeur hire and airport transfers — vehicle classes, driver assignment, route pricing, and live duty board.",
    icon: "Car",
    category: "mobility",
    monthlyPrice: 109,
    features: [
      "Vehicle class & pricing",
      "Driver assignment",
      "Airport & city transfers",
      "Live duty / dispatch board",
    ],
  },
  {
    id: "fleetManagement",
    name: "Fleet Management",
    tagline: "Own, track, and maintain every vehicle",
    description:
      "Central fleet register for cars, vans, and coaches — utilization, GPS/status, fuel & mileage logs, insurance renewals, and workshop maintenance.",
    icon: "Truck",
    category: "mobility",
    monthlyPrice: 139,
    features: [
      "Fleet register & vehicle status",
      "Utilization & assignment calendar",
      "Fuel, mileage & cost logs",
      "Insurance & maintenance alerts",
    ],
  },
  {
    id: "b2cOta",
    name: "B2C OTA",
    tagline: "Consumer online travel agency storefront",
    description:
      "White-label OTA website for leisure customers — flight, hotel, packages, payments, promotions, and SEO-ready catalog connected to your mid/back office.",
    icon: "Globe",
    category: "digital",
    monthlyPrice: 249,
    features: [
      "Consumer booking website",
      "Packages & promo engine",
      "Payment gateway ready*",
      "Syncs to Mid / Back Office",
    ],
  },
  {
    id: "b2cMobile",
    name: "B2C Mobile App",
    tagline: "Leisure travel app for your brand",
    description:
      "Branded iOS/Android app for end customers — search, book, vouchers, trip wallet, push offers, and post-trip support tickets.",
    icon: "Smartphone",
    category: "digital",
    monthlyPrice: 199,
    features: [
      "Branded iOS & Android apps",
      "Search, book & vouchers",
      "Push offers & loyalty hooks",
      "In-app support chat/tickets",
    ],
  },
  {
    id: "b2bMobile",
    name: "B2B Mobile App",
    tagline: "Agency booking on the go",
    description:
      "Mobile app for travel agents — quick search/book, wallet balance, booking status, and statements while away from the desk.",
    icon: "TabletSmartphone",
    category: "digital",
    monthlyPrice: 179,
    features: [
      "Agent login & multi-branch",
      "Book flight / hotel / transfer",
      "Wallet & credit visibility",
      "Booking status & alerts",
    ],
  },
  {
    id: "cbtMobile",
    name: "CBT Mobile App",
    tagline: "Corporate travel app for employees",
    description:
      "Employee-facing corporate booking app — policy-aware search, approval requests, itineraries, and expense-ready trip history.",
    icon: "Smartphone",
    category: "digital",
    monthlyPrice: 169,
    features: [
      "Policy-aware search",
      "In-app approvals",
      "Trip itineraries offline",
      "Spend history for finance",
    ],
  },
  {
    id: "propertyBuy",
    name: "Buy Property",
    tagline: "Sales pipeline for property purchase",
    description:
      "Listings, buyer leads, site visits, offer negotiation, reservation fees, and handover tracking for residential and commercial sales.",
    icon: "Home",
    category: "property",
    monthlyPrice: 159,
    features: [
      "Property listing catalog",
      "Buyer CRM & site visits",
      "Offers & reservation fees",
      "Handover & document checklist",
    ],
  },
  {
    id: "propertyRent",
    name: "Rent Property",
    tagline: "Leasing, tenants, and renewals",
    description:
      "Rental inventory, tenant onboarding, lease agreements, rent collection schedules, renewals, and maintenance tickets for landlords and agencies.",
    icon: "KeyRound",
    category: "property",
    monthlyPrice: 149,
    features: [
      "Rental unit inventory",
      "Lease & tenant records",
      "Rent schedules & receipts",
      "Renewals & maintenance tickets",
    ],
  },
  {
    id: "api",
    name: "API",
    tagline: "Connect Nexus to your stack",
    description:
      "Secure REST & webhook platform for partners and internal systems — bookings, inventory, rates, customers, and payments with keys, scopes, rate limits, and sandbox.",
    icon: "Code2",
    category: "platform",
    monthlyPrice: 199,
    features: [
      "REST APIs & webhooks",
      "API keys, scopes & environments",
      "Rate limits & usage analytics",
      "Sandbox + production credentials",
    ],
  },
  {
    id: "paymentGateway",
    name: "Online Payment Gateway",
    tagline: "Collect and reconcile payments online",
    description:
      "Multi-provider payment acceptance for OTA, agency, and corporate checkouts — cards, wallets, and bank transfers with 3-D Secure, refunds, settlement reports, and ledger sync.",
    icon: "CreditCard",
    category: "platform",
    monthlyPrice: 149,
    features: [
      "Multi-PSP connectors (card & wallet)",
      "3-D Secure & fraud rules*",
      "Refunds, voids & chargebacks desk",
      "Settlement reports → Finance",
    ],
  },
];

export const SAAS_PLANS: SaasPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: `For teams launching ${SAAS_BRAND.name} with core travel POS.`,
    monthlyPrice: 399,
    includedModules: ["sales", "backOffice", "accounts", "crm"],
    maxUsers: 20,
    highlights: [
      "4 core modules included",
      "Up to 20 users",
      "Email support",
      "Standard onboarding",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "Scale travel ops, partners, and digital channels.",
    monthlyPrice: 999,
    includedModules: [
      "sales",
      "backOffice",
      "midOffice",
      "operations",
      "agency",
      "accounts",
      "extranet",
      "crm",
      "b2cOta",
    ],
    maxUsers: 100,
    popular: true,
    highlights: [
      "9 modules included (incl. Operations + B2C OTA)",
      "Up to 100 users",
      "Add property & mobile à la carte",
      "Priority support & training",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Full stack for holdings — travel, property, CRM & apps.",
    monthlyPrice: 2499,
    includedModules: "all",
    maxUsers: "unlimited",
    highlights: [
      "Every module included",
      "Unlimited users",
      "API & payment gateway included",
      "Dedicated success manager",
      "Custom SLAs & white-label apps*",
    ],
  },
];

export function getModule(id: SaasModuleId): SaasModule | undefined {
  return SAAS_MODULES.find((m) => m.id === id);
}

export function planIncludesModule(plan: SaasPlan, moduleId: SaasModuleId): boolean {
  if (plan.includedModules === "all") return true;
  return plan.includedModules.includes(moduleId);
}

/** Estimate monthly total: plan base + add-on modules not included in the plan. */
export function estimateMonthlyTotal(planId: SaasPlanId, moduleIds: SaasModuleId[]): number {
  const plan = SAAS_PLANS.find((p) => p.id === planId);
  if (!plan) return 0;
  if (plan.includedModules === "all") return plan.monthlyPrice;

  const addOns = moduleIds.filter((id) => !planIncludesModule(plan, id));
  const addOnTotal = addOns.reduce((sum, id) => sum + (getModule(id)?.monthlyPrice ?? 0), 0);
  return plan.monthlyPrice + addOnTotal;
}

export const MODULE_CATEGORIES: { id: SaasModule["category"]; label: string }[] = [
  { id: "operations", label: "Travel Operations" },
  { id: "partners", label: "Partners & Portals" },
  { id: "growth", label: "CRM & Growth" },
  { id: "digital", label: "OTA & Mobile" },
  { id: "property", label: "Real Estate" },
  { id: "finance", label: "Finance & Control" },
  { id: "mobility", label: "Mobility" },
  { id: "platform", label: "Platform" },
];
