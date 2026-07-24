import type { RoleDef } from "@/types";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export type ModuleKey =
  | "dashboard"
  | "bookings"
  | "inventory"
  | "agents"
  | "corporate"
  | "billing"
  | "reports"
  | "settings"
  | "masters"
  | "tenantProfile"
  | "company"
  | "branch"
  | "users"
  | "roles"
  | "partners"
  | "agency"
  | "subAgency"
  | "corporateAccounts"
  | "supplier";

export interface MenuItem {
  key: ModuleKey;
  labelKey: string;
  icon: string;
  /** Path segment appended after /(dashboard)/[role]/ */
  path: string;
  /** Group items render as an expandable accordion; key/path are unused for navigation. */
  children?: MenuItem[];
}

export const MENU_ITEMS: MenuItem[] = [
  { key: "dashboard", labelKey: "sidebar.dashboard", icon: "LayoutDashboard", path: "dashboard" },
  { key: "bookings", labelKey: "sidebar.bookings", icon: "CalendarCheck", path: "bookings" },
  { key: "inventory", labelKey: "sidebar.inventory", icon: "Building2", path: "inventory" },
  { key: "agents", labelKey: "sidebar.agents", icon: "Network", path: "agents" },
  { key: "corporate", labelKey: "sidebar.corporate", icon: "Briefcase", path: "corporate" },
  { key: "billing", labelKey: "sidebar.billing", icon: "Receipt", path: "billing" },
  { key: "reports", labelKey: "sidebar.reports", icon: "BarChart3", path: "reports" },
  {
    key: "masters",
    labelKey: "sidebar.masters",
    icon: "Layers",
    path: "masters",
    children: [
      { key: "tenantProfile", labelKey: "sidebar.tenantProfile", icon: "Building", path: "masters/tenant" },
      { key: "company", labelKey: "sidebar.company", icon: "Building2", path: "masters/company" },
      { key: "branch", labelKey: "sidebar.branch", icon: "GitBranch", path: "masters/branch" },
      { key: "users", labelKey: "sidebar.users", icon: "Users", path: "masters/users" },
      { key: "roles", labelKey: "sidebar.roles", icon: "KeyRound", path: "masters/roles" },
    ],
  },
  {
    key: "partners",
    labelKey: "sidebar.partners",
    icon: "Handshake",
    path: "partners",
    children: [
      { key: "agency", labelKey: "sidebar.agency", icon: "Users2", path: "masters/agency" },
      { key: "subAgency", labelKey: "sidebar.subAgency", icon: "GitFork", path: "masters/subAgency" },
      { key: "corporateAccounts", labelKey: "sidebar.corporateAccounts", icon: "Landmark", path: "masters/corporateAccounts" },
      { key: "supplier", labelKey: "sidebar.supplier", icon: "Store", path: "masters/supplier" },
    ],
  },
  { key: "settings", labelKey: "sidebar.settings", icon: "Settings", path: "settings" },
];

/** Flat lookup by ModuleKey, including nested Masters/Partners children — used by Topbar/menu lookups. */
export function findMenuItem(key: ModuleKey): MenuItem | undefined {
  for (const item of MENU_ITEMS) {
    if (item.key === key) return item;
    const child = item.children?.find((c) => c.key === key);
    if (child) return child;
  }
  return undefined;
}

/** Flat list of every leaf item (group children included, group nodes excluded) — used for path resolution. */
export function flatMenuItems(): MenuItem[] {
  return MENU_ITEMS.flatMap((item) => (item.children ? item.children : [item]));
}

export function can(roleDef: RoleDef | undefined, module: ModuleKey, action: PermissionAction): boolean {
  if (!roleDef) return false;
  return roleDef.permissions[module]?.includes(action) ?? false;
}

export function getMenuForRole(roleDef: RoleDef | undefined): MenuItem[] {
  if (!roleDef) return [];

  function filterItems(items: MenuItem[]): MenuItem[] {
    return items.reduce<MenuItem[]>((acc, item) => {
      if (item.children) {
        const visibleChildren = filterItems(item.children);
        if (visibleChildren.length > 0) acc.push({ ...item, children: visibleChildren });
        return acc;
      }
      if (can(roleDef, item.key, "view")) acc.push(item);
      return acc;
    }, []);
  }

  return filterItems(MENU_ITEMS);
}

export function roleHomePath(roleDef: RoleDef): string {
  return `/${roleDef.slug}/dashboard`;
}
