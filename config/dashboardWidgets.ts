import type { Role } from "@/types";
import type { DashboardKpis } from "@/lib/services/bookings.service";

export type KpiFormat = "money" | "number" | "percent";

export interface KpiWidget {
  key: keyof DashboardKpis;
  label: string;
  icon: string;
  format: KpiFormat;
}

/** Which 4 KPI fields (from getDashboardKpis) each role sees on its dashboard, and how to render them. */
export const DASHBOARD_KPIS: Record<Role, KpiWidget[]> = {
  company_employee: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Revenue", icon: "TrendingUp", format: "money" },
    { key: "pendingApprovals", label: "Pending Approvals", icon: "ClipboardCheck", format: "number" },
    { key: "activeUsers", label: "Active Users", icon: "Users", format: "number" },
  ],
  hotelier: [
    { key: "confirmedBookings", label: "Active Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Revenue", icon: "TrendingUp", format: "money" },
    { key: "occupancyRate", label: "Occupancy Rate", icon: "BedDouble", format: "percent" },
    { key: "avgBookingValue", label: "Avg. Booking Value", icon: "Receipt", format: "money" },
  ],
  supplier: [
    { key: "confirmedBookings", label: "Active Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Revenue", icon: "TrendingUp", format: "money" },
    { key: "servicesListed", label: "Services Listed", icon: "Package", format: "number" },
    { key: "pendingBookings", label: "Pending Confirmations", icon: "ClipboardCheck", format: "number" },
  ],
  dmc: [
    { key: "confirmedBookings", label: "Active Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Revenue", icon: "TrendingUp", format: "money" },
    { key: "destinationPackages", label: "Destination Packages", icon: "MapPinned", format: "number" },
    { key: "pendingBookings", label: "Pending Requests", icon: "ClipboardCheck", format: "number" },
  ],
  agent: [
    { key: "totalBookings", label: "Total Bookings", icon: "CalendarCheck", format: "number" },
    { key: "commissionEarned", label: "Commission Earned", icon: "TrendingUp", format: "money" },
    { key: "walletBalance", label: "Wallet Balance", icon: "Wallet", format: "money" },
    { key: "pendingBookings", label: "Pending Bookings", icon: "ClipboardCheck", format: "number" },
  ],
  sub_agent: [
    { key: "totalBookings", label: "My Bookings", icon: "CalendarCheck", format: "number" },
    { key: "commissionEarned", label: "Commission Earned", icon: "TrendingUp", format: "money" },
    { key: "creditLimit", label: "Credit Limit", icon: "CreditCard", format: "money" },
    { key: "pendingBookings", label: "Pending Bookings", icon: "ClipboardCheck", format: "number" },
  ],
  corporate_customer: [
    { key: "totalBookings", label: "Employee Bookings", icon: "CalendarCheck", format: "number" },
    { key: "totalRevenue", label: "Total Spend", icon: "TrendingUp", format: "money" },
    { key: "pendingApprovals", label: "Pending Approvals", icon: "ClipboardCheck", format: "number" },
    { key: "policyComplianceRate", label: "Policy Compliance", icon: "ShieldCheck", format: "percent" },
  ],
};
