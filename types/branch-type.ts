import type { ReferenceStatus } from "./country";

/** Branch Type master — Super Admin / Tenant Configuration only (e.g. Head Office, Branch Office). */
export interface BranchType {
  id: string;
  branchTypeKey: number;
  name: string;
  status: ReferenceStatus;
  createdAt: string;
}
