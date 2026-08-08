/** Supplier's own contact/portal users — a real login User is created alongside every SupplierUser. */
export interface SupplierUser {
  id: string;
  supplierUserKey: number;
  supplierId: number;
  supplierName?: string;
  firstName: string;
  lastName: string;
  email: string;
  dialCountryCode: string | null;
  mobileNumber: string | null;
  accessRoleId: number;
  accessRoleName?: string;
  userKey: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
}
