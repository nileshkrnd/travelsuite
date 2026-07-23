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
    scopeKind: "all",
    permissions: {
      dashboard: [...ALL_ACTIONS],
      employee: [...ALL_ACTIONS],
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
    },
  }),
  seedRole({
    id: "role_company_employee",
    name: "Company Employee",
    description: "Internal staff — manages bookings, employees, and day-to-day operations.",
    scopeKind: "all",
    permissions: {
      dashboard: ["view"],
      employee: ["view", "create", "edit", "delete"],
      bookings: ["view", "create", "edit", "approve"],
      agents: ["view", "edit"],
      corporate: ["view", "approve"],
      billing: ["view", "create", "edit"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
  seedRole({
    id: "role_hotelier",
    name: "Hotelier",
    description: "Property partner — manages room inventory and views their bookings.",
    scopeKind: "hotelier",
    permissions: {
      dashboard: ["view"],
      bookings: ["view"],
      inventory: ["view", "create", "edit", "delete"],
      billing: ["view"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
  seedRole({
    id: "role_supplier",
    name: "Supplier",
    description: "Inventory supplier — transport, activities, and other services.",
    scopeKind: "supplier",
    permissions: {
      dashboard: ["view"],
      bookings: ["view"],
      inventory: ["view", "create", "edit", "delete"],
      billing: ["view"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
  seedRole({
    id: "role_dmc",
    name: "DMC",
    description: "Destination management company — manages destination packages and services.",
    scopeKind: "dmc",
    permissions: {
      dashboard: ["view"],
      bookings: ["view"],
      inventory: ["view", "create", "edit", "delete"],
      billing: ["view"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
  seedRole({
    id: "role_agent",
    name: "Agent",
    description: "B2B travel agent — books on behalf of clients, manages sub-agents.",
    scopeKind: "agent",
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
    id: "role_sub_agent",
    name: "Sub-Agent",
    description: "Reports up to an Agent — books on behalf of clients.",
    scopeKind: "subAgent",
    permissions: {
      dashboard: ["view"],
      bookings: ["view", "create", "edit"],
      billing: ["view"],
      settings: ["view"],
    },
  }),
  seedRole({
    id: "role_corporate_customer",
    name: "Corporate Customer",
    description: "Company booking on behalf of employees, subject to travel policy approval.",
    scopeKind: "corporate",
    permissions: {
      dashboard: ["view"],
      bookings: ["view", "create"],
      corporate: ["view", "create", "approve"],
      billing: ["view"],
      reports: ["view"],
      settings: ["view", "edit"],
    },
  }),
];

export const SUPER_ADMIN_ROLE_ID = "role_super_admin";
