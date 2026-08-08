import type { EmployeePropertyAccess } from "@/types";

export interface EmployeePropertyAccessRow {
  employeePropertyAccessId: bigint | number;
  tenantId: number;
  companyId: number;
  employeeId: number;
  propertyId: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  isActive: boolean;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  createdBy: number;
  createdDtTm: Date | string;
  employee?: { title: string; firstName: string; lastName: string } | null;
  property?: { propertyCode: string; propertyName: string | null } | null;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function toAppEmployeePropertyAccess(row: EmployeePropertyAccessRow): EmployeePropertyAccess {
  return {
    id: String(row.employeePropertyAccessId),
    employeePropertyAccessKey: Number(row.employeePropertyAccessId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    employeeId: row.employeeId,
    employeeName: row.employee
      ? `${row.employee.title} ${row.employee.firstName} ${row.employee.lastName}`.trim()
      : undefined,
    propertyId: row.propertyId,
    propertyCode: row.property?.propertyCode,
    propertyName: row.property?.propertyName ?? undefined,
    canView: row.canView,
    canCreate: row.canCreate,
    canEdit: row.canEdit,
    canSubmit: row.canSubmit,
    canApprove: row.canApprove,
    isActive: row.isActive,
    validFrom: toDateOnly(row.validFrom),
    validTo: toDateOnly(row.validTo),
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm),
  };
}
