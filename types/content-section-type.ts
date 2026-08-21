/** Content section type lookup — What to Expect, Additional Info, Know Before You Go, Important Information, What to Bring. */
export interface ContentSectionType {
  contentSectionTypeId: number;
  tenantId: number | null;
  companyId: number | null;
  sectionTypeCode: string;
  sectionTypeName: string;
  description: string | null;
  isStepBased: boolean;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
