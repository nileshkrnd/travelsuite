import type { SupplierType } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const supplierTypes: SupplierType[] = [
  { id: "stype_dmc", tenantId: DEFAULT_TENANT_ID, name: "DMC" },
  { id: "stype_hotelier", tenantId: DEFAULT_TENANT_ID, name: "Hotelier" },
  { id: "stype_tour_operator", tenantId: DEFAULT_TENANT_ID, name: "Tour Operator" },
  { id: "stype_transport", tenantId: DEFAULT_TENANT_ID, name: "Transport" },
  { id: "stype_activity", tenantId: DEFAULT_TENANT_ID, name: "Activity Provider" },
];
