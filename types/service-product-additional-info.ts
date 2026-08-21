/** A typed additional-info value for a Service Product (optionally scoped to an Option/Variant). */
export interface ServiceProductAdditionalInfo {
  serviceProductAdditionalInfoId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  additionalInfoTypeId: number;
  infoTypeCode?: string;
  infoTypeName?: string;
  valueTypeCode?: string;
  valueBoolean: boolean | null;
  valueText: string | null;
  valueNumber: number | null;
  /** YYYY-MM-DD */
  valueDate: string | null;
  /** HH:mm:ss */
  valueTime: string | null;
  valueDateTime: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
