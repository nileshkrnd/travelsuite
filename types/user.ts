export type UserStatus = "active" | "invited" | "deactivated";

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roleId: string;
  /** category: internal */
  companyId?: string;
  branchId?: string;
  /** category: agency */
  agencyId?: string;
  /** category: subAgency */
  subAgencyId?: string;
  /** category: corporate */
  corporateId?: string;
  /** category: supplier */
  supplierId?: string;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: string;
}
