/** Access Role ↔ Module Menu permission flags (tenant/company scoped). */
export interface TenantAccessRoleMenuPermission {
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
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  /** Joined display */
  accessRoleName?: string;
  menuName?: string;
  menuUrl?: string;
}

export type MenuPermissionFlags = Pick<
  TenantAccessRoleMenuPermission,
  | "canView"
  | "canCreate"
  | "canEdit"
  | "canDelete"
  | "canApprove"
  | "canExport"
  | "canPrint"
  | "canReadOnly"
  | "isActive"
>;

export interface MenuPermissionRowInput extends MenuPermissionFlags {
  subscriptionModuleMenuId: number;
}
