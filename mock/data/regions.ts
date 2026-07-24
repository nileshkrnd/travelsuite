import type { Region } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const regions: Region[] = [
  {
    id: "region_emea",
    tenantId: DEFAULT_TENANT_ID,
    code: "EMEA",
    name: "Europe, Middle East & Africa",
    status: "active",
    createdAt: "2023-11-05T09:00:00.000Z",
  },
  {
    id: "region_apac",
    tenantId: DEFAULT_TENANT_ID,
    code: "APAC",
    name: "Asia Pacific",
    status: "active",
    createdAt: "2024-01-15T09:00:00.000Z",
  },
];
