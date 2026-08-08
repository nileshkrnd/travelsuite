import type { Facility } from "@/types";

export interface FacilityRow {
  facilityId: number;
  amenityFacilityCategoryId: number;
  facilityCode: string;
  facilityName: string;
  description: string | null;
  icon: string | null;
  isFilterable: boolean;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  category?: { categoryName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppFacility(row: FacilityRow): Facility {
  return {
    id: String(row.facilityId),
    facilityKey: row.facilityId,
    categoryKey: row.amenityFacilityCategoryId,
    categoryName: row.category?.categoryName,
    code: row.facilityCode,
    name: row.facilityName,
    description: row.description,
    icon: row.icon,
    isFilterable: row.isFilterable,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
