/** Occupancy Type master — Single, Double, Triple, … Scoped by TenantID + CompanyID. */
export interface OccupancyType {
  occupancyTypeId: number;
  occupancyTypeCode: string;
  occupancyTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
  companyName?: string;
}
