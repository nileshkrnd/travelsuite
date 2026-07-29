/**
 * Cost Centre master (mock-first) — used on standard voucher headers
 * for dimensional reporting (travel products, branches, campaigns).
 */
export type CostCenterStatus = "active" | "inactive";

export interface CostCenter {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: CostCenterStatus;
  createdAt: string;
}
