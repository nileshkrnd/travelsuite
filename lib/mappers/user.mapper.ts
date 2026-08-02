import { DEFAULT_PREVIEW_TENANT } from "@/mock/data/tenants";
import {
  APP_WORKSPACE_ROLE_ID,
  SUPER_ADMIN_ROLE_ID,
  TENANT_ADMIN_ROLE_ID,
} from "@/mock/data/roles";
import {
  defaultUserTypeId,
  isUserTypeId,
  userScopeFromTypeId,
  type User,
  type UserScope,
  type UserTypeId,
} from "@/types";

const PLATFORM_TENANT_ID = DEFAULT_PREVIEW_TENANT.id;

export interface UserRow {
  userId: number;
  username: string;
  userDisplayName: string;
  userTypeId: number;
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
  // Neutral URL shell `/app/…` — menus come from Access Role permissions.
  return APP_WORKSPACE_ROLE_ID;
}

function resolveUserTypeId(row: UserRow): UserTypeId {
  if (isUserTypeId(row.userTypeId)) return row.userTypeId;
  return defaultUserTypeId(row.tenantId, row.companyId);
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
    /** Employee photo path/URL when the user has a linked Employee record. */
    avatarUrl?: string | null;
    /** CompanyID from linked Employee when User.companyId is 0. */
    employeeCompanyKey?: number | null;
  }
): User {
  const userTypeId = resolveUserTypeId(row);
  const scope = userScopeFromTypeId(userTypeId);
  const tenantUid =
    row.tenantId === 0
      ? PLATFORM_TENANT_ID
      : (opts?.tenantUidByKey?.get(row.tenantId) ?? `tenant_${row.tenantId}`);
  const companyUid =
    row.companyId > 0 ? (opts?.companyUidByKey?.get(row.companyId) ?? `company_${row.companyId}`) : undefined;
  const avatarUrl = opts?.avatarUrl?.trim() || undefined;
  const employeeCompanyKey =
    opts?.employeeCompanyKey != null && opts.employeeCompanyKey > 0
      ? opts.employeeCompanyKey
      : undefined;

  return {
    id: `user_${row.userId}`,
    userKey: row.userId,
    username: row.username,
    name: row.userDisplayName,
    email: row.username,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    employeeCompanyKey,
    userTypeId,
    tenantId: tenantUid,
    companyId: companyUid,
    roleId: roleIdForScope(scope),
    scope,
    avatarUrl,
    status: row.isActive ? "active" : "deactivated",
    isActive: row.isActive,
    createdAt: toIso(row.createDtTm) ?? new Date().toISOString(),
    lastLoggedInDtTm: toIso(row.lastLoggedInDtTm),
    lastPasswordChangeDtTm: toIso(row.lastPasswordChangeDtTm),
  };
}
