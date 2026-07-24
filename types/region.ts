export type RegionStatus = "active" | "inactive";

export interface Region {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: RegionStatus;
  createdAt: string;
}
