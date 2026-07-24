import type { Supplier } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const suppliers: Supplier[] = [
  {
    id: "supplier_grand_piazza",
    tenantId: DEFAULT_TENANT_ID,
    name: "Grand Piazza Hotel",
    supplierTypeId: "stype_hotelier",
    status: "active",
    createdAt: "2024-03-04T09:00:00.000Z",
  },
  {
    id: "supplier_swift_transfers",
    tenantId: DEFAULT_TENANT_ID,
    name: "Swift Transfers",
    supplierTypeId: "stype_transport",
    status: "active",
    createdAt: "2024-01-22T09:00:00.000Z",
  },
  {
    id: "supplier_roma_dmc",
    tenantId: DEFAULT_TENANT_ID,
    name: "Roma DMC",
    supplierTypeId: "stype_dmc",
    status: "active",
    createdAt: "2024-02-27T09:00:00.000Z",
  },
];
