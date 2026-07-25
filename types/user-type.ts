/**
 * User master UserTypeID — fixed enum values (not a DB lookup table).
 */
export const UserType = {
  SuperAdmin: 1,
  TenantAdmin: 2,
  InternalEmployee: 3,
  AgencyUser: 4,
  SubAgencyUser: 5,
  CorporateUser: 6,
  CashCustomer: 7,
  SupplierUser: 8,
} as const;

export type UserTypeId = (typeof UserType)[keyof typeof UserType];

export const USER_TYPE_IDS = [
  UserType.SuperAdmin,
  UserType.TenantAdmin,
  UserType.InternalEmployee,
  UserType.AgencyUser,
  UserType.SubAgencyUser,
  UserType.CorporateUser,
  UserType.CashCustomer,
  UserType.SupplierUser,
] as const;

export const USER_TYPE_LABELS: Record<UserTypeId, string> = {
  [UserType.SuperAdmin]: "Super Admin",
  [UserType.TenantAdmin]: "Tenant Admin",
  [UserType.InternalEmployee]: "Internal Employee",
  [UserType.AgencyUser]: "Agency User",
  [UserType.SubAgencyUser]: "SubAgency User",
  [UserType.CorporateUser]: "Corporate User",
  [UserType.CashCustomer]: "Cash Customer",
  [UserType.SupplierUser]: "Supplier User",
};

export function isUserTypeId(value: number): value is UserTypeId {
  return (USER_TYPE_IDS as readonly number[]).includes(value);
}

export function userTypeLabel(userTypeId: number): string {
  return isUserTypeId(userTypeId) ? USER_TYPE_LABELS[userTypeId] : `Type ${userTypeId}`;
}

/** Default UserTypeID from TenantID / CompanyID when not supplied. */
export function defaultUserTypeId(tenantId: number, companyId: number): UserTypeId {
  if (tenantId === 0 && companyId === 0) return UserType.SuperAdmin;
  if (tenantId > 0 && companyId === 0) return UserType.TenantAdmin;
  return UserType.InternalEmployee;
}
