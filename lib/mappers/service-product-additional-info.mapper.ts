import type { ServiceProductAdditionalInfo } from "@/types";

export interface ServiceProductAdditionalInfoRow {
  serviceProductAdditionalInfoId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  additionalInfoTypeId: bigint | number;
  valueBoolean: boolean | null;
  valueText: string | null;
  valueNumber: { toString(): string } | number | string | null;
  valueDate: Date | string | null;
  valueTime: Date | string | null;
  valueDateTime: Date | string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  serviceProductOption?: { optionName: string } | null;
  serviceProductVariant?: { variantName: string } | null;
  additionalInfoType?: { infoTypeCode: string; infoTypeName: string; valueTypeCode: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

function toTimeOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(11, 19);
}

export function toAppServiceProductAdditionalInfo(row: ServiceProductAdditionalInfoRow): ServiceProductAdditionalInfo {
  return {
    serviceProductAdditionalInfoId: Number(row.serviceProductAdditionalInfoId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.serviceProductOption?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.serviceProductVariant?.variantName ?? undefined,
    additionalInfoTypeId: Number(row.additionalInfoTypeId),
    infoTypeCode: row.additionalInfoType?.infoTypeCode ?? undefined,
    infoTypeName: row.additionalInfoType?.infoTypeName ?? undefined,
    valueTypeCode: row.additionalInfoType?.valueTypeCode ?? undefined,
    valueBoolean: row.valueBoolean,
    valueText: row.valueText,
    valueNumber: row.valueNumber != null ? Number(row.valueNumber.toString()) : null,
    valueDate: toDateOnly(row.valueDate),
    valueTime: toTimeOnly(row.valueTime),
    valueDateTime: toIso(row.valueDateTime),
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
