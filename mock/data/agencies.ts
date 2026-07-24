import type { Agency } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const agencies: Agency[] = [
  {
    id: "agency_travelwise",
    tenantId: DEFAULT_TENANT_ID,
    name: "TravelWise Agency",
    status: "active",
    createdAt: "2023-11-30T09:00:00.000Z",
  },
];
