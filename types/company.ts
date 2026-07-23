export type CompanyStatus = "active" | "inactive";

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  status: CompanyStatus;
  createdAt: string;
}
