import type { Role } from "@/types";
import { ROLES } from "@/types";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export type ModuleKey =
  | "dashboard"
  | "users"
  | "bookings"
  | "inventory"
  | "agents"
  | "corporate"
  | "billing"
  | "reports"
  | "settings";

export interface MenuItem {
  key: ModuleKey;
  labelKey: string;
  icon: string;
  /** Path segment appended after /(dashboard)/[role]/ */
  path: string;
  roles: Role[];
}

const ALL_ROLES = ROLES;

export const MENU_ITEMS: MenuItem[] = [
  { key: "dashboard", labelKey: "sidebar.dashboard", icon: "LayoutDashboard", path: "dashboard", roles: ALL_ROLES },
  { key: "users", labelKey: "sidebar.users", icon: "Users", path: "users", roles: ["company_employee"] },
  { key: "bookings", labelKey: "sidebar.bookings", icon: "CalendarCheck", path: "bookings", roles: ALL_ROLES },
  { key: "inventory", labelKey: "sidebar.inventory", icon: "Building2", path: "inventory", roles: ["hotelier", "supplier", "dmc"] },
  { key: "agents", labelKey: "sidebar.agents", icon: "Network", path: "agents", roles: ["agent", "sub_agent", "company_employee"] },
  { key: "corporate", labelKey: "sidebar.corporate", icon: "Briefcase", path: "corporate", roles: ["corporate_customer", "company_employee"] },
  { key: "billing", labelKey: "sidebar.billing", icon: "Receipt", path: "billing", roles: ALL_ROLES },
  { key: "reports", labelKey: "sidebar.reports", icon: "BarChart3", path: "reports", roles: ["company_employee", "agent", "hotelier", "supplier", "dmc", "corporate_customer"] },
  { key: "settings", labelKey: "sidebar.settings", icon: "Settings", path: "settings", roles: ALL_ROLES },
];

export const PERMISSIONS: Record<Role, Partial<Record<ModuleKey, PermissionAction[]>>> = {
  company_employee: {
    dashboard: ["view"],
    users: ["view", "create", "edit", "delete"],
    bookings: ["view", "create", "edit", "approve"],
    agents: ["view", "edit"],
    corporate: ["view", "approve"],
    billing: ["view", "create", "edit"],
    reports: ["view"],
    settings: ["view", "edit"],
  },
  hotelier: {
    dashboard: ["view"],
    bookings: ["view"],
    inventory: ["view", "create", "edit", "delete"],
    billing: ["view"],
    reports: ["view"],
    settings: ["view", "edit"],
  },
  supplier: {
    dashboard: ["view"],
    bookings: ["view"],
    inventory: ["view", "create", "edit", "delete"],
    billing: ["view"],
    reports: ["view"],
    settings: ["view", "edit"],
  },
  dmc: {
    dashboard: ["view"],
    bookings: ["view"],
    inventory: ["view", "create", "edit", "delete"],
    billing: ["view"],
    reports: ["view"],
    settings: ["view", "edit"],
  },
  agent: {
    dashboard: ["view"],
    bookings: ["view", "create", "edit"],
    agents: ["view", "create", "edit"],
    billing: ["view"],
    reports: ["view"],
    settings: ["view", "edit"],
  },
  sub_agent: {
    dashboard: ["view"],
    bookings: ["view", "create", "edit"],
    billing: ["view"],
    settings: ["view"],
  },
  corporate_customer: {
    dashboard: ["view"],
    bookings: ["view", "create"],
    corporate: ["view", "create", "approve"],
    billing: ["view"],
    reports: ["view"],
    settings: ["view", "edit"],
  },
};

export function getMenuForRole(role: Role): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.roles.includes(role));
}

export function can(role: Role, module: ModuleKey, action: PermissionAction): boolean {
  return PERMISSIONS[role]?.[module]?.includes(action) ?? false;
}

export function roleHomePath(role: Role): string {
  return `/${role}/dashboard`;
}
