/** A traveler requirement for a Service Product (optionally scoped to an Option/Variant) — passport, visa, age, waiver, … */
export interface ServiceProductRequirement {
  serviceProductRequirementId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  requirementTypeId: number;
  requirementTypeCode?: string;
  requirementTypeName?: string;
  requirementName: string;
  description: string | null;
  isMandatory: boolean;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
