import type { ServiceProductItemType } from "@/types";

export interface ServiceProductItemTypeRow {
  serviceProductItemTypeId: bigint | number;
  itemTypeCode: string;
  itemTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductItemType(row: ServiceProductItemTypeRow): ServiceProductItemType {
  return {
    serviceProductItemTypeId: Number(row.serviceProductItemTypeId),
    itemTypeCode: row.itemTypeCode,
    itemTypeName: row.itemTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
