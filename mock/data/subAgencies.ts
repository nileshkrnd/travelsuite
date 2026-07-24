import type { SubAgency } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const subAgencies: SubAgency[] = [
  {
    id: "subagency_petrova",
    tenantId: DEFAULT_TENANT_ID,
    agencyId: "agency_travelwise",
    name: "Petrova Travels",
    status: "active",
    createdAt: "2024-05-14T09:00:00.000Z",
  },
];
