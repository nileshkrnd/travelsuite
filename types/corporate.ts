export type CorporateStatus = "active" | "inactive";

export interface Corporate {
  id: string;
  tenantId: string;
  name: string;
  status: CorporateStatus;
  createdAt: string;
}
