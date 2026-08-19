/** Status-type catalog — the entity a status lifecycle applies to (Tenant Registration, Property, Service Product, …). */
export interface CommonStatusType {
  commonStatusTypeId: number;
  statusTypeCode: string;
  statusTypeName: string;
  description: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string;
}
