import type { Corporate } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const corporates: Corporate[] = [
  {
    id: "corporate_acme",
    tenantId: DEFAULT_TENANT_ID,
    name: "Acme Corp",
    status: "active",
    createdAt: "2024-04-02T09:00:00.000Z",
  },
];
