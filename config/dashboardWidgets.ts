import type { RoleCategory, RoleDef } from "@/types";
import type { DashboardKpis } from "@/lib/services/bookings.service";

export type KpiFormat = "money" | "number" | "percent";

export interface KpiWidget {
  key: keyof DashboardKpis;
  label: string;
  icon: string;
  format: KpiFormat;
}

/** Tailored widget sets for the seeded roles, keyed by their stable id (mock/data/roles.ts). */
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
  role_hr: [
    { key: "activeUsers", label: "Total Employees", icon: "Users", format: "number" },
    { key: "pendingApprovals", label: "Pending Leave Requests", icon: "ClipboardCheck", format: "number" },
    { key: "policyComplianceRate", label: "Attendance Rate", icon: "ShieldCheck", format: "percent" },
    { key: "servicesListed", label: "Open Positions", icon: "UserPlus", format: "number" },
  ],
  role_sales: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Revenue", icon: "TrendingUp", format: "money" },
    { key: "avgBookingValue", label: "Avg. Deal Value", icon: "Receipt", format: "money" },
    { key: "pendingBookings", label: "Open Leads", icon: "ClipboardCheck", format: "number" },
  ],
  role_back_office: [
    { key: "pendingBookings", label: "Pending Booking Queue", icon: "ClipboardCheck", format: "number" },
    { key: "confirmedBookings", label: "Confirmed Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalBookings", label: "Total Processed", icon: "TrendingUp", format: "number" },
    { key: "pendingApprovals", label: "Amendments Pending", icon: "ClipboardCheck", format: "number" },
  ],
  role_mid_office: [
    { key: "confirmedBookings", label: "Active Reservations", icon: "CalendarCheck", format: "number" },
    { key: "pendingBookings", label: "QC Queue", icon: "ClipboardCheck", format: "number" },
    { key: "totalBookings", label: "Tickets Issued", icon: "TrendingUp", format: "number" },
    { key: "pendingApprovals", label: "Refunds Pending", icon: "ClipboardCheck", format: "number" },
  ],
  role_accounts: [
    { key: "totalRevenue", label: "Total Revenue", icon: "TrendingUp", format: "money" },
    { key: "avgBookingValue", label: "Avg. Invoice Value", icon: "Receipt", format: "money" },
    { key: "pendingApprovals", label: "Pending Payments", icon: "ClipboardCheck", format: "number" },
    { key: "totalBookings", label: "Invoices Raised", icon: "CalendarCheck", format: "number" },
  ],
  role_crm: [
    { key: "totalBookings", label: "Open Opportunities", icon: "TrendingUp", format: "number" },
    { key: "activeUsers", label: "Total Customers", icon: "Users", format: "number" },
    { key: "pendingApprovals", label: "Open Support Tickets", icon: "ClipboardCheck", format: "number" },
    { key: "totalRevenue", label: "Pipeline Value", icon: "Receipt", format: "money" },
  ],
  role_agency_user: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "commissionEarned", label: "Commission Earned", icon: "TrendingUp", format: "money" },
    { key: "walletBalance", label: "Wallet Balance", icon: "Wallet", format: "money" },
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
  subAgency: DASHBOARD_KPIS_BY_ROLE_ID.role_agency_user,
  corporate: DASHBOARD_KPIS_BY_ROLE_ID.role_corporate_employee,
  supplier: DASHBOARD_KPIS_BY_ROLE_ID.role_supplier,
};

export function getDashboardWidgets(roleDef: RoleDef): KpiWidget[] {
  return DASHBOARD_KPIS_BY_ROLE_ID[roleDef.id] ?? DASHBOARD_KPIS_BY_CATEGORY[roleDef.category];
}
