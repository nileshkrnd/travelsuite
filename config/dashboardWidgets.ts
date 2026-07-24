import type { RoleCategory, RoleDef } from "@/types";
import type { DashboardKpis } from "@/lib/services/bookings.service";

export type KpiFormat = "money" | "number" | "percent";

export interface KpiWidget {
  key: keyof DashboardKpis;
  label: string;
  icon: string;
  format: KpiFormat;
}

/** Tailored widget sets for the 9 seeded roles, keyed by their stable id (mock/data/roles.ts). */
const DASHBOARD_KPIS_BY_ROLE_ID: Record<string, KpiWidget[]> = {
  role_super_admin: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Revenue", icon: "TrendingUp", format: "money" },
    { key: "activeUsers", label: "Active Employees", icon: "Users", format: "number" },
    { key: "pendingApprovals", label: "Pending Approvals", icon: "ClipboardCheck", format: "number" },
  ],
  role_administrator: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Revenue", icon: "TrendingUp", format: "money" },
    { key: "pendingApprovals", label: "Pending Approvals", icon: "ClipboardCheck", format: "number" },
    { key: "activeUsers", label: "Active Users", icon: "Users", format: "number" },
  ],
  role_accountant: [
    { key: "totalRevenue", label: "Total Revenue", icon: "TrendingUp", format: "money" },
    { key: "avgBookingValue", label: "Avg. Booking Value", icon: "Receipt", format: "money" },
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "pendingBookings", label: "Pending Follow-up", icon: "ClipboardCheck", format: "number" },
  ],
  role_cashier: [
    { key: "totalRevenue", label: "Total Collected", icon: "TrendingUp", format: "money" },
    { key: "avgBookingValue", label: "Avg. Transaction", icon: "Receipt", format: "money" },
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "pendingBookings", label: "Pending Payments", icon: "ClipboardCheck", format: "number" },
  ],
  role_agency_user: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "commissionEarned", label: "Commission Earned", icon: "TrendingUp", format: "money" },
    { key: "walletBalance", label: "Wallet Balance", icon: "Wallet", format: "money" },
    { key: "pendingBookings", label: "Pending Bookings", icon: "ClipboardCheck", format: "number" },
  ],
  role_subagency_user: [
    { key: "totalBookings", label: "My Bookings", icon: "CalendarCheck", format: "number" },
    { key: "commissionEarned", label: "Commission Earned", icon: "TrendingUp", format: "money" },
    { key: "creditLimit", label: "Credit Limit", icon: "CreditCard", format: "money" },
    { key: "pendingBookings", label: "Pending Bookings", icon: "ClipboardCheck", format: "number" },
  ],
  role_corporate_employee: [
    { key: "totalBookings", label: "Employee Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Spend", icon: "TrendingUp", format: "money" },
    { key: "pendingApprovals", label: "Pending Approvals", icon: "ClipboardCheck", format: "number" },
    { key: "policyComplianceRate", label: "Policy Compliance", icon: "ShieldCheck", format: "percent" },
  ],
  role_supplier: [
    { key: "confirmedBookings", label: "Active Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Revenue", icon: "TrendingUp", format: "money" },
    { key: "servicesListed", label: "Services Listed", icon: "Package", format: "number" },
    { key: "pendingBookings", label: "Pending Confirmations", icon: "ClipboardCheck", format: "number" },
  ],
};

/** Fallback widget set for a custom role (Super Admin-created), based on its category. */
const DASHBOARD_KPIS_BY_CATEGORY: Record<RoleCategory, KpiWidget[]> = {
  internal: DASHBOARD_KPIS_BY_ROLE_ID.role_administrator,
  agency: DASHBOARD_KPIS_BY_ROLE_ID.role_agency_user,
  subAgency: DASHBOARD_KPIS_BY_ROLE_ID.role_subagency_user,
  corporate: DASHBOARD_KPIS_BY_ROLE_ID.role_corporate_employee,
  supplier: DASHBOARD_KPIS_BY_ROLE_ID.role_supplier,
};

export function getDashboardWidgets(roleDef: RoleDef): KpiWidget[] {
  return DASHBOARD_KPIS_BY_ROLE_ID[roleDef.id] ?? DASHBOARD_KPIS_BY_CATEGORY[roleDef.category];
}
