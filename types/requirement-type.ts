/** Requirement type lookup — Passport, Visa, Driving license, Age requirement, … */
export interface RequirementType {
  requirementTypeId: number;
  tenantId: number | null;
  companyId: number | null;
  requirementTypeCode: string;
  requirementTypeName: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
