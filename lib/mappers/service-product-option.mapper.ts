import type { ServiceProductOption } from "@/types";

export interface ServiceProductOptionRow {
  serviceProductOptionId: bigint | number;
  serviceProductId: bigint | number;
  optionCode: string;
  optionName: string;
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
  serviceProduct?: { serviceProductName: string } | null;
  commonStatus?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductOption(row: ServiceProductOptionRow): ServiceProductOption {
  return {
    serviceProductOptionId: Number(row.serviceProductOptionId),
    serviceProductId: Number(row.serviceProductId),
    productName: row.serviceProduct?.serviceProductName ?? undefined,
    optionCode: row.optionCode,
    optionName: row.optionName,
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
