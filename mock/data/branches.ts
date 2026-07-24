import type { Branch } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const branches: Branch[] = [
  {
    id: "branch_mumbai",
    tenantId: DEFAULT_TENANT_ID,
    companyId: "company_leisure",
    name: "Mumbai",
    code: "mumbai",
    city: "Mumbai",
    country: "IN",
    status: "active",
    createdAt: "2023-11-10T09:00:00.000Z",
  },
  {
    id: "branch_dubai",
    tenantId: DEFAULT_TENANT_ID,
    companyId: "company_leisure",
    name: "Dubai",
    code: "dubai",
    city: "Dubai",
    country: "AE",
    status: "active",
    createdAt: "2024-02-01T09:00:00.000Z",
  },
  {
    id: "branch_london",
    tenantId: DEFAULT_TENANT_ID,
    companyId: "company_corporate",
    name: "London",
    code: "london",
    city: "London",
    country: "GB",
    status: "active",
    createdAt: "2024-01-20T09:00:00.000Z",
  },
];
