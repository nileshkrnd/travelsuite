import type { RoleDef, ScopeKind } from "@/types";
import type { DashboardKpis } from "@/lib/services/bookings.service";

export type KpiFormat = "money" | "number" | "percent";

export interface KpiWidget {
  key: keyof DashboardKpis;
  label: string;
  icon: string;
  format: KpiFormat;
}

/** Tailored widget sets for the 8 seeded roles, keyed by their stable id (mock/data/roles.ts). */
const DASHBOARD_KPIS_BY_ROLE_ID: Record<string, KpiWidget[]> = {
  role_super_admin: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Revenue", icon: "TrendingUp", format: "money" },
    { key: "activeUsers", label: "Active Employees", icon: "Users", format: "number" },
    { key: "pendingApprovals", label: "Pending Approvals", icon: "ClipboardCheck", format: "number" },
  ],
  role_company_employee: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Revenue", icon: "TrendingUp", format: "money" },
    { key: "pendingApprovals", label: "Pending Approvals", icon: "ClipboardCheck", format: "number" },
    { key: "activeUsers", label: "Active Users", icon: "Users", format: "number" },
  ],
  role_hotelier: [
    { key: "confirmedBookings", label: "Active Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Revenue", icon: "TrendingUp", format: "money" },
    { key: "occupancyRate", label: "Occupancy Rate", icon: "BedDouble", format: "percent" },
    { key: "avgBookingValue", label: "Avg. Booking Value", icon: "Receipt", format: "money" },
  ],
  role_supplier: [
    { key: "confirmedBookings", label: "Active Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Revenue", icon: "TrendingUp", format: "money" },
    { key: "servicesListed", label: "Services Listed", icon: "Package", format: "number" },
    { key: "pendingBookings", label: "Pending Confirmations", icon: "ClipboardCheck", format: "number" },
  ],
  role_dmc: [
    { key: "confirmedBookings", label: "Active Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Revenue", icon: "TrendingUp", format: "money" },
    { key: "destinationPackages", label: "Destination Packages", icon: "MapPinned", format: "number" },
    { key: "pendingBookings", label: "Pending Requests", icon: "ClipboardCheck", format: "number" },
  ],
  role_agent: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "commissionEarned", label: "Commission Earned", icon: "TrendingUp", format: "money" },
    { key: "walletBalance", label: "Wallet Balance", icon: "Wallet", format: "money" },
    { key: "pendingBookings", label: "Pending Bookings", icon: "ClipboardCheck", format: "number" },
  ],
  role_sub_agent: [
    { key: "totalBookings", label: "My Bookings", icon: "CalendarCheck", format: "number" },
    { key: "commissionEarned", label: "Commission Earned", icon: "TrendingUp", format: "money" },
    { key: "creditLimit", label: "Credit Limit", icon: "CreditCard", format: "money" },
    { key: "pendingBookings", label: "Pending Bookings", icon: "ClipboardCheck", format: "number" },
  ],
  role_corporate_customer: [
    { key: "totalBookings", label: "Employee Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Spend", icon: "TrendingUp", format: "money" },
    { key: "pendingApprovals", label: "Pending Approvals", icon: "ClipboardCheck", format: "number" },
    { key: "policyComplianceRate", label: "Policy Compliance", icon: "ShieldCheck", format: "percent" },
  ],
};

/** Fallback widget set for a custom role (Super Admin-created), based on its scopeKind. */
const DASHBOARD_KPIS_BY_SCOPE: Record<ScopeKind, KpiWidget[]> = {
  all: DASHBOARD_KPIS_BY_ROLE_ID.role_company_employee,
  agent: DASHBOARD_KPIS_BY_ROLE_ID.role_agent,
  subAgent: DASHBOARD_KPIS_BY_ROLE_ID.role_sub_agent,
  hotelier: DASHBOARD_KPIS_BY_ROLE_ID.role_hotelier,
  supplier: DASHBOARD_KPIS_BY_ROLE_ID.role_supplier,
  dmc: DASHBOARD_KPIS_BY_ROLE_ID.role_dmc,
  corporate: DASHBOARD_KPIS_BY_ROLE_ID.role_corporate_customer,
};

export function getDashboardWidgets(roleDef: RoleDef): KpiWidget[] {
  return DASHBOARD_KPIS_BY_ROLE_ID[roleDef.id] ?? DASHBOARD_KPIS_BY_SCOPE[roleDef.scopeKind];
}
