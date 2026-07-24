export type SubAgencyStatus = "active" | "inactive";

export interface SubAgency {
  id: string;
  tenantId: string;
  agencyId: string;
  name: string;
  status: SubAgencyStatus;
  createdAt: string;
}
