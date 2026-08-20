/** Rate type catalog — Adult, Child, Infant, Vehicle, Room, Unit, Applicant, … */
export interface RateType {
  rateTypeId: number;
  rateTypeCode: string;
  rateTypeName: string;
  description: string | null;
  rateTypeGroupId: number | null;
  rateTypeGroupName?: string;
  isPaxType: boolean;
  isQuantityType: boolean;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string;
}
