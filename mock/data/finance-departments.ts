import type { FinanceDepartment } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

/** Seed departments for standard voucher headers. */
export const financeDepartments: FinanceDepartment[] = [
  {
    id: "fdept_sales",
    tenantId: DEFAULT_TENANT_ID,
    code: "SALES",
    name: "Sales",
    status: "active",
    createdAt: "2024-01-10T09:00:00.000Z",
  },
  {
    id: "fdept_ops",
    tenantId: DEFAULT_TENANT_ID,
    code: "OPS",
    name: "Operations",
    status: "active",
    createdAt: "2024-01-10T09:00:00.000Z",
  },
  {
    id: "fdept_fin",
    tenantId: DEFAULT_TENANT_ID,
    code: "FIN",
    name: "Finance",
    status: "active",
    createdAt: "2024-01-10T09:00:00.000Z",
  },
  {
    id: "fdept_hr",
    tenantId: DEFAULT_TENANT_ID,
    code: "HR",
    name: "Human Resources",
    status: "active",
    createdAt: "2024-01-10T09:00:00.000Z",
  },
  {
    id: "fdept_mkt",
    tenantId: DEFAULT_TENANT_ID,
    code: "MKT",
    name: "Marketing",
    status: "active",
    createdAt: "2024-02-01T09:00:00.000Z",
  },
];
