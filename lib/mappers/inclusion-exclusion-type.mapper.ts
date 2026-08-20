import type { InclusionExclusionType } from "@/types";

export interface InclusionExclusionTypeRow {
  inclusionExclusionTypeId: bigint | number;
  typeCode: string;
  typeName: string;
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

export function toAppInclusionExclusionType(row: InclusionExclusionTypeRow): InclusionExclusionType {
  return {
    inclusionExclusionTypeId: Number(row.inclusionExclusionTypeId),
    typeCode: row.typeCode,
    typeName: row.typeName,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
