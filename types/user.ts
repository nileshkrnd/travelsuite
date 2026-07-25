export type UserStatus = "active" | "invited" | "deactivated";

/** Derived from TenantID / CompanyID on the User master. */
export type UserScope = "superAdmin" | "tenantAdmin" | "employee";

export interface User {
  id: string;
  /** Numeric UserID — used as CreatedBy / ModifiedBy. */
  userKey: number;
  username: string;
  /** Display name (UserDisplayName). */
  name: string;
  /** Login identity — same as username for DB-backed users. */
  email: string;
  /** Numeric TenantID (0 = platform Super Admin). */
  tenantKey: number;
  /** Numeric CompanyID (0 = no company / Tenant Admin). */
  companyKey: number;
  /** App tenant uid when tenantKey > 0; platform id when 0. */
  tenantId: string;
  roleId: string;
  scope: UserScope;
  /** category: internal — string company id when companyKey > 0 */
  companyId?: string;
  branchId?: string;
  agencyId?: string;
  subAgencyId?: string;
  corporateId?: string;
  supplierId?: string;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  isActive: boolean;
  createdAt: string;
  lastLoggedInDtTm?: string | null;
  lastPasswordChangeDtTm?: string | null;
}

export function userScopeFromKeys(tenantKey: number, companyKey: number): UserScope {
  if (tenantKey === 0 && companyKey === 0) return "superAdmin";
  if (tenantKey > 0 && companyKey === 0) return "tenantAdmin";
  return "employee";
}
