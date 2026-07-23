export type UserStatus = "active" | "invited" | "deactivated";

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roleId: string;
  companyId?: string;
  branchId?: string;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: string;
}
