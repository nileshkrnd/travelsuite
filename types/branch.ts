export type BranchStatus = "active" | "inactive";

export interface Branch {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  city: string;
  country: string;
  status: BranchStatus;
  createdAt: string;
}
