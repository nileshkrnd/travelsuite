/** Property tenant type master — Individual, Company, Government, Other. */
export interface PropertyTenantType {
  propertyTenantTypeId: number;
  tenantTypeCode: string;
  tenantTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
