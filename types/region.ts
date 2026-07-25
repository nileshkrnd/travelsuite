export type RegionStatus = "active" | "inactive";

/** Global Region master (not tenant/company scoped). */
export interface Region {
  regionId: number;
  regionCode: string;
  regionName: string;
  status: RegionStatus;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
