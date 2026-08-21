export type AdditionalInfoValueTypeCode = "BOOLEAN" | "TEXT" | "NUMBER" | "DATE" | "TIME" | "DATETIME";

/** Additional-info type lookup — Wheelchair accessible, Confirmation at booking, Minimum age, … */
export interface AdditionalInfoType {
  additionalInfoTypeId: number;
  tenantId: number | null;
  companyId: number | null;
  infoTypeCode: string;
  infoTypeName: string;
  description: string | null;
  valueTypeCode: AdditionalInfoValueTypeCode;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
