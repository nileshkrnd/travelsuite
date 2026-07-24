import type { Company } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const companies: Company[] = [
  {
    id: "company_leisure",
    tenantId: DEFAULT_TENANT_ID,
    name: "Horizon Leisure",
    code: "horizonLeisure",
    status: "active",
    createdAt: "2023-11-05T09:00:00.000Z",
  },
  {
    id: "company_corporate",
    tenantId: DEFAULT_TENANT_ID,
    name: "Horizon Corporate Travel",
    code: "horizonCorporate",
    status: "active",
    createdAt: "2024-01-15T09:00:00.000Z",
  },
];
