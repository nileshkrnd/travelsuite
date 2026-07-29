import type { CostCenter } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

/** Seed cost centres for voucher tagging / P&L by dimension. */
export const costCenters: CostCenter[] = [
  {
    id: "cc_leisure",
    tenantId: DEFAULT_TENANT_ID,
    code: "LEISURE",
    name: "Leisure Travel",
    status: "active",
    createdAt: "2024-01-10T09:00:00.000Z",
  },
  {
    id: "cc_corporate",
    tenantId: DEFAULT_TENANT_ID,
    code: "CORP",
    name: "Corporate Travel",
    status: "active",
    createdAt: "2024-01-10T09:00:00.000Z",
  },
  {
    id: "cc_mice",
    tenantId: DEFAULT_TENANT_ID,
    code: "MICE",
    name: "MICE / Groups",
    status: "active",
    createdAt: "2024-01-10T09:00:00.000Z",
  },
  {
    id: "cc_online",
    tenantId: DEFAULT_TENANT_ID,
    code: "ONLINE",
    name: "Online / B2C",
    status: "active",
    createdAt: "2024-02-01T09:00:00.000Z",
  },
  {
    id: "cc_admin",
    tenantId: DEFAULT_TENANT_ID,
    code: "ADMIN",
    name: "Administration",
    status: "active",
    createdAt: "2024-02-01T09:00:00.000Z",
  },
];
