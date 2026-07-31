import type { TenantAccessRoleMenuPermission } from "@/types";

export interface TenantAccessRoleMenuPermissionRow {
  tenantAccessRoleMenuPermissionId: number;
  tenantId: number;
  companyId: number;
  accessRoleId: number;
  subscriptionModuleMenuId: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  canPrint: boolean;
  canReadOnly: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  accessRole?: { accessRoleName: string } | null;
  menu?: { menuName: string; menuUrl: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppTenantAccessRoleMenuPermission(
  row: TenantAccessRoleMenuPermissionRow
): TenantAccessRoleMenuPermission {
  return {
    tenantAccessRoleMenuPermissionId: row.tenantAccessRoleMenuPermissionId,
    tenantId: row.tenantId,
    companyId: row.companyId,
    accessRoleId: row.accessRoleId,
    subscriptionModuleMenuId: row.subscriptionModuleMenuId,
    canView: row.canView,
    canCreate: row.canCreate,
    canEdit: row.canEdit,
    canDelete: row.canDelete,
    canApprove: row.canApprove,
    canExport: row.canExport,
    canPrint: row.canPrint,
    canReadOnly: row.canReadOnly,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    accessRoleName: row.accessRole?.accessRoleName,
    menuName: row.menu?.menuName,
    menuUrl: row.menu?.menuUrl,
  };
}
