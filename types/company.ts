export type CompanyStatus = "active" | "inactive";

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  status: CompanyStatus;
  createdAt: string;
}
