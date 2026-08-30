export const ADDITIONAL_INFO_VALUE_TYPE_CODES = [
  "BOOLEAN",
  "TEXT",
  "NUMBER",
  "DATE",
  "TIME",
  "DATETIME",
] as const;

export type AdditionalInfoValueTypeCode = (typeof ADDITIONAL_INFO_VALUE_TYPE_CODES)[number];

export const ADDITIONAL_INFO_VALUE_TYPE_LABELS: Record<AdditionalInfoValueTypeCode, string> = {
  BOOLEAN: "Yes / No",
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  TIME: "Time",
  DATETIME: "Date & time",
};

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
