/** Service Type master — Flight, Hotel, Transfer, … Tenant + Company scoped. */
export interface ServiceType {
  serviceTypeId: number;
  serviceTypeCode: string;
  serviceTypeName: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
  /** Optional display name when company join is available. */
  companyName?: string;
}
