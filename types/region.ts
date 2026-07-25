export interface Region {
  regionId: number;
  tenantId: number;
  companyId: number;
  regionCode: string;
  regionName: string;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
