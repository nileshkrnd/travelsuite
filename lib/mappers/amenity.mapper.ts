import type { Amenity } from "@/types";

export interface AmenityRow {
  amenityId: number;
  amenityFacilityCategoryId: number;
  amenityCode: string;
  amenityName: string;
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

export function toAppAmenity(row: AmenityRow): Amenity {
  return {
    id: String(row.amenityId),
    amenityKey: row.amenityId,
    categoryKey: row.amenityFacilityCategoryId,
    categoryName: row.category?.categoryName,
    code: row.amenityCode,
    name: row.amenityName,
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
