import type { ServiceProductVariant } from "@/types";

export interface ServiceProductVariantRow {
  serviceProductVariantId: bigint | number;
  serviceProductOptionId: bigint | number;
  variantCode: string;
  variantName: string;
  description: string | null;
  displayOrder: number;
  isDefault: boolean;
  isOnlineSellable: boolean;
  commonStatusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  option?: { optionName: string } | null;
  commonStatus?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductVariant(row: ServiceProductVariantRow): ServiceProductVariant {
  return {
    serviceProductVariantId: Number(row.serviceProductVariantId),
    serviceProductOptionId: Number(row.serviceProductOptionId),
    optionName: row.option?.optionName ?? undefined,
    variantCode: row.variantCode,
    variantName: row.variantName,
    description: row.description,
    displayOrder: row.displayOrder,
    isDefault: row.isDefault,
    isOnlineSellable: row.isOnlineSellable,
    commonStatusId: Number(row.commonStatusId),
    statusName: row.commonStatus?.statusName ?? undefined,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
