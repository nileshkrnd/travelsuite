import type { PropertySeason } from "@/types";

export interface PropertySeasonRow {
  propertySeasonId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyId: number;
  seasonCode: string;
  seasonName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  property?: { propertyName: string | null; propertyCode: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertySeason(row: PropertySeasonRow): PropertySeason {
  return {
    id: String(row.propertySeasonId),
    propertySeasonKey: Number(row.propertySeasonId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyId: row.propertyId,
    propertyName: row.property?.propertyName ?? row.property?.propertyCode,
    propertyCode: row.property?.propertyCode,
    seasonCode: row.seasonCode,
    seasonName: row.seasonName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
