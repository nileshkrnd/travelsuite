export type BranchStatus = "active" | "inactive";

export interface Branch {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  city: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US". */
  country: string;
  status: BranchStatus;
  createdAt: string;
}
