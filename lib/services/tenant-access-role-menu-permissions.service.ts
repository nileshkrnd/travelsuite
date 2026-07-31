import {
  toAppTenantAccessRoleMenuPermission,
  type TenantAccessRoleMenuPermissionRow,
} from "@/lib/mappers/tenant-access-role-menu-permission.mapper";
import type { MenuPermissionRowInput, TenantAccessRoleMenuPermission } from "@/types";

export class TenantAccessRoleMenuPermissionsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "TenantAccessRoleMenuPermissionsApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function listTenantAccessRoleMenuPermissions(options: {
  tenantId: number;
  companyId: number;
  accessRoleId: number;
}): Promise<TenantAccessRoleMenuPermission[]> {
  const params = new URLSearchParams({
    tenantId: String(options.tenantId),
    companyId: String(options.companyId),
    accessRoleId: String(options.accessRoleId),
  });
  const res = await fetch(`/api/tenant-access-role-menu-permissions?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new TenantAccessRoleMenuPermissionsApiError(await parseError(res), res.status);
  }
  const data = (await res.json()) as TenantAccessRoleMenuPermissionRow[];
  return data.map(toAppTenantAccessRoleMenuPermission);
}

export async function saveTenantAccessRoleMenuPermissions(input: {
  tenantId: number;
  companyId: number;
  accessRoleId: number;
  createdBy: number;
  modifiedBy: number;
  rows: MenuPermissionRowInput[];
}): Promise<TenantAccessRoleMenuPermission[]> {
  const res = await fetch("/api/tenant-access-role-menu-permissions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new TenantAccessRoleMenuPermissionsApiError(await parseError(res), res.status);
  }
  const data = (await res.json()) as TenantAccessRoleMenuPermissionRow[];
  return data.map(toAppTenantAccessRoleMenuPermission);
}
