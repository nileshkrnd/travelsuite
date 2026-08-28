import type { AccessRole } from "@/types";

export interface AccessRoleRow {
  accessRoleId: bigint | number;
  accessRoleName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number;
  companyId: number;
}

export function serializeAccessRoleRow<T extends { accessRoleId: bigint | number }>(row: T) {
  return { ...row, accessRoleId: Number(row.accessRoleId) };
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppAccessRole(row: AccessRoleRow): AccessRole {
  return {
    accessRoleId: Number(row.accessRoleId),
    accessRoleName: row.accessRoleName,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    tenantId: row.tenantId,
    companyId: row.companyId,
  };
}
