import type { Role } from "./role";

export type UserStatus = "active" | "invited" | "deactivated";

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: string;
}
