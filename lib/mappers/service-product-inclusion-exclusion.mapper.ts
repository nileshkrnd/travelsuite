import type { ServiceProductInclusionExclusion } from "@/types";

export interface ServiceProductInclusionExclusionRow {
  serviceProductInclusionExclusionId: bigint | number;
  serviceProductId: bigint | number;
  inclusionExclusionTypeId: bigint | number;
  itemTypeId: bigint | number | null;
  itemName: string;
  description: string | null;
  quantity: unknown;
  unitId: bigint | number | null;
  isMandatory: boolean;
  displayOrder: number;
  commonStatusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  inclusionExclusionType?: { typeName: string } | null;
  itemType?: { itemTypeName: string } | null;
  unit?: { itemTypeName: string } | null;
  commonStatus?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function toAppServiceProductInclusionExclusion(
  row: ServiceProductInclusionExclusionRow
): ServiceProductInclusionExclusion {
  return {
    serviceProductInclusionExclusionId: Number(row.serviceProductInclusionExclusionId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    inclusionExclusionTypeId: Number(row.inclusionExclusionTypeId),
    inclusionExclusionTypeName: row.inclusionExclusionType?.typeName ?? undefined,
    itemTypeId: row.itemTypeId != null ? Number(row.itemTypeId) : null,
    itemTypeName: row.itemType?.itemTypeName ?? undefined,
    itemName: row.itemName,
    description: row.description,
    quantity: toNumberOrNull(row.quantity),
    unitId: row.unitId != null ? Number(row.unitId) : null,
    unitName: row.unit?.itemTypeName ?? undefined,
    isMandatory: row.isMandatory,
    displayOrder: row.displayOrder,
    commonStatusId: Number(row.commonStatusId),
    statusName: row.commonStatus?.statusName ?? undefined,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
