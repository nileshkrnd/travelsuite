import type { RoleDef } from "@/types";
import { toCamelSlug } from "@/lib/slug";
import { DEFAULT_TENANT_ID } from "./tenants";

const ALL_ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;

function seedRole(input: Omit<RoleDef, "id" | "tenantId" | "slug" | "isSystem" | "createdAt"> & { id: string }): RoleDef {
  return {
    ...input,
    tenantId: DEFAULT_TENANT_ID,
    slug: toCamelSlug(input.name),
    isSystem: true,
    createdAt: "2023-11-01T09:00:00.000Z",
  };
}

export const roles: RoleDef[] = [
  seedRole({
    id: "role_super_admin",
    name: "Super Admin",
    description: "Full control of the tenant, including org structure and role/permission management.",
    category: "internal",
    permissions: {
      dashboard: [...ALL_ACTIONS],
      users: [...ALL_ACTIONS],
      bookings: [...ALL_ACTIONS],
      inventory: [...ALL_ACTIONS],
      agents: [...ALL_ACTIONS],
      corporate: [...ALL_ACTIONS],
      billing: [...ALL_ACTIONS],
      reports: [...ALL_ACTIONS],
      settings: [...ALL_ACTIONS],
      company: [...ALL_ACTIONS],
      branch: [...ALL_ACTIONS],
      roles: [...ALL_ACTIONS],
      tenantProfile: [...ALL_ACTIONS],
      agency: [...ALL_ACTIONS],
      subAgency: [...ALL_ACTIONS],
      corporateAccounts: [...ALL_ACTIONS],
      supplier: [...ALL_ACTIONS],
    },
  }),
  seedRole({
    id: "role_administrator",
    name: "Administrator",
    description: "Runs day-to-day operations — org structure, employees, bookings, billing.",
    category: "internal",
    permissions: {
      dashboard: ["view"],
      users: ["view", "create", "edit", "delete"],
      company: ["view", "create", "edit"],
      branch: ["view", "create", "edit"],
      bookings: ["view", "create", "edit", "approve"],
      agents: ["view", "edit"],
      corporate: ["view", "approve"],
      billing: ["view", "create", "edit"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
  seedRole({
    id: "role_accountant",
    name: "Accountant",
    description: "Manages billing and invoicing, reviews financial reports.",
    category: "internal",
    permissions: {
      dashboard: ["view"],
      billing: ["view", "create", "edit", "delete"],
      reports: ["view"],
      bookings: ["view"],
      settings: ["view"],
    },
  }),
  seedRole({
    id: "role_cashier",
    name: "Cashier",
    description: "Records payments against bookings and invoices.",
    category: "internal",
    permissions: {
      dashboard: ["view"],
      billing: ["view", "create"],
      bookings: ["view"],
      settings: ["view"],
    },
  }),
  seedRole({
    id: "role_agency_user",
    name: "Agency User",
    description: "B2B travel agency staff — books on behalf of clients, manages sub-agencies.",
    category: "agency",
    permissions: {
      dashboard: ["view"],
      bookings: ["view", "create", "edit"],
      agents: ["view", "create", "edit"],
      billing: ["view"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
  seedRole({
    id: "role_subagency_user",
    name: "SubAgency User",
    description: "Sub-agency staff — reports up to a parent agency, books on behalf of clients.",
    category: "subAgency",
    permissions: {
      dashboard: ["view"],
      bookings: ["view", "create", "edit"],
      billing: ["view"],
      settings: ["view"],
    },
  }),
  seedRole({
    id: "role_corporate_employee",
    name: "Corporate Employee",
    description: "Books travel on behalf of their company, subject to travel policy approval.",
    category: "corporate",
    permissions: {
      dashboard: ["view"],
      bookings: ["view", "create"],
      corporate: ["view", "create", "approve"],
      billing: ["view"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
  seedRole({
    id: "role_supplier",
    name: "Supplier",
    description: "Inventory partner — hoteliers, DMCs, tour operators, and other service providers.",
    category: "supplier",
    permissions: {
      dashboard: ["view"],
      bookings: ["view"],
      inventory: ["view", "create", "edit", "delete"],
      billing: ["view"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
];

export const SUPER_ADMIN_ROLE_ID = "role_super_admin";
