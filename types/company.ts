export type CompanyStatus = "active" | "inactive";

export interface Company {
  id: string;
  /** Numeric key for DB scope columns (CompanyID). */
  companyKey: number;
  tenantId: string;
  name: string;
  code: string;
  status: CompanyStatus;
  createdAt: string;
}
