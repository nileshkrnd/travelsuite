import { DEFAULT_PREVIEW_TENANT } from "@/mock/data/tenants";
import { SUPER_ADMIN_ROLE_ID, TENANT_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { userScopeFromKeys, type User, type UserScope } from "@/types";

const PLATFORM_TENANT_ID = DEFAULT_PREVIEW_TENANT.id;

export interface UserRow {
  userId: number;
  username: string;
  userDisplayName: string;
  tenantId: number;
  companyId: number;
  lastLoggedInDtTm: Date | string | null;
  lastPasswordChangeDtTm: Date | string | null;
  createdBy: number;
  createDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  isActive: boolean;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function roleIdForScope(scope: UserScope): string {
  if (scope === "superAdmin") return SUPER_ADMIN_ROLE_ID;
  if (scope === "tenantAdmin") return TENANT_ADMIN_ROLE_ID;
  return "role_hr"; // default employee-facing role until role master moves to DB
}

/**
 * Maps a DB User row to the app User.
 * `tenantUidByKey` / `companyUidByKey` resolve numeric FKs to app string ids.
 */
export function toAppUser(
  row: UserRow,
  opts?: {
    tenantUidByKey?: Map<number, string>;
    companyUidByKey?: Map<number, string>;
  }
): User {
  const scope = userScopeFromKeys(row.tenantId, row.companyId);
  const tenantUid =
    row.tenantId === 0
      ? PLATFORM_TENANT_ID
      : (opts?.tenantUidByKey?.get(row.tenantId) ?? `tenant_${row.tenantId}`);
  const companyUid =
    row.companyId > 0 ? (opts?.companyUidByKey?.get(row.companyId) ?? `company_${row.companyId}`) : undefined;

  return {
    id: `user_${row.userId}`,
    userKey: row.userId,
    username: row.username,
    name: row.userDisplayName,
    email: row.username,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    tenantId: tenantUid,
    companyId: companyUid,
    roleId: roleIdForScope(scope),
    scope,
    status: row.isActive ? "active" : "deactivated",
    isActive: row.isActive,
    createdAt: toIso(row.createDtTm) ?? new Date().toISOString(),
    lastLoggedInDtTm: toIso(row.lastLoggedInDtTm),
    lastPasswordChangeDtTm: toIso(row.lastPasswordChangeDtTm),
  };
}
