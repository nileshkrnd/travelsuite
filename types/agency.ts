export type AgencyStatus = "active" | "inactive";

export interface Agency {
  id: string;
  tenantId: string;
  name: string;
  status: AgencyStatus;
  createdAt: string;
}
