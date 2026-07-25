import type { User } from "@/types";
import { UserType } from "@/types";
import { DEFAULT_PREVIEW_TENANT, DEFAULT_TENANT_ID } from "./tenants";

/** Legacy mock cache — login and User master are DB-backed. Kept for store migrate fallback. */
export const users: User[] = [
  {
    id: "user_1",
    userKey: 1,
    username: "superadmin@travelsuite.com",
    name: "Super Admin",
    email: "superadmin@travelsuite.com",
    tenantKey: 0,
    companyKey: 0,
    userTypeId: UserType.SuperAdmin,
    tenantId: DEFAULT_PREVIEW_TENANT.id,
    roleId: "role_super_admin",
    scope: "superAdmin",
    status: "active",
    isActive: true,
    createdAt: "2023-10-15T09:00:00.000Z",
  },
  {
    id: "user_2",
    userKey: 2,
    username: "admin@travelsuite.com",
    name: "Alex Tenant Admin",
    email: "admin@travelsuite.com",
    tenantKey: 1,
    companyKey: 0,
    userTypeId: UserType.TenantAdmin,
    tenantId: DEFAULT_TENANT_ID,
    roleId: "role_administrator",
    scope: "tenantAdmin",
    status: "active",
    isActive: true,
    createdAt: "2024-02-11T09:00:00.000Z",
  },
];

export const MOCK_PASSWORD = "123456";
