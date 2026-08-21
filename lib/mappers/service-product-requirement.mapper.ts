import type { ServiceProductRequirement } from "@/types";

export interface ServiceProductRequirementRow {
  serviceProductRequirementId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  requirementTypeId: bigint | number;
  requirementName: string;
  description: string | null;
  isMandatory: boolean;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  option?: { optionName: string } | null;
  variant?: { variantName: string } | null;
  requirementType?: { requirementTypeCode: string; requirementTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductRequirement(row: ServiceProductRequirementRow): ServiceProductRequirement {
  return {
    serviceProductRequirementId: Number(row.serviceProductRequirementId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.option?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.variant?.variantName ?? undefined,
    requirementTypeId: Number(row.requirementTypeId),
    requirementTypeCode: row.requirementType?.requirementTypeCode ?? undefined,
    requirementTypeName: row.requirementType?.requirementTypeName ?? undefined,
    requirementName: row.requirementName,
    description: row.description,
    isMandatory: row.isMandatory,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
