import type { OccupancyType } from "@/types";

export interface OccupancyTypeRow {
  occupancyTypeId: number;
  occupancyTypeCode: string;
  occupancyTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number;
  companyId: number;
  companyName?: string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppOccupancyType(row: OccupancyTypeRow): OccupancyType {
  return {
    occupancyTypeId: row.occupancyTypeId,
    occupancyTypeCode: row.occupancyTypeCode,
    occupancyTypeName: row.occupancyTypeName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    tenantId: row.tenantId,
    companyId: row.companyId,
    companyName: row.companyName ?? undefined,
  };
}
