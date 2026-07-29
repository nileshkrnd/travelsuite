/**
 * Department options for Finance vouchers (mock-first).
 * Parallel to the HR Department master; can be mapped to Department.departmentId later.
 */
export type FinanceDepartmentStatus = "active" | "inactive";

export interface FinanceDepartment {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: FinanceDepartmentStatus;
  createdAt: string;
}
