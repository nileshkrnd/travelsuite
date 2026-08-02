import type { Company, User } from "@/types";

/**
 * Resolves the working CompanyID for tenant-scoped masters.
 * Prefers the login User.companyId, then a linked Employee company.
 * Returns null when the user may choose among companies (e.g. Tenant Admin without a company).
 */
export function resolveSessionCompanyKey(user: User | null | undefined): number | null {
  if (!user) return null;
  if (user.companyKey > 0) return user.companyKey;
  if (user.employeeCompanyKey != null && user.employeeCompanyKey > 0) {
    return user.employeeCompanyKey;
  }
  return null;
}

/**
 * Whether company should be locked (no picker) for this user in a tenant workspace.
 * Super Admin keeps the picker so they can manage any company in the selected tenant.
 */
export function shouldLockSessionCompany(
  user: User | null | undefined,
  companies: Company[]
): { locked: boolean; companyId: number | null } {
  if (!user || user.scope === "superAdmin") {
    return { locked: false, companyId: null };
  }

  const sessionCompanyId = resolveSessionCompanyKey(user);
  if (sessionCompanyId != null) {
    const allowed = companies.some((c) => c.companyKey === sessionCompanyId);
    if (allowed) return { locked: true, companyId: sessionCompanyId };
  }

  // Single-company tenants: no need to ask.
  if (companies.length === 1 && companies[0]!.companyKey > 0) {
    return { locked: true, companyId: companies[0]!.companyKey };
  }

  return { locked: false, companyId: null };
}
