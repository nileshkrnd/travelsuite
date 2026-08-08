import type { AmenityFacilityCategory, ApplicableTo } from "@/types";

export interface AmenityFacilityCategoryRow {
  amenityFacilityCategoryId: number;
  categoryCode: string;
  categoryName: string;
  applicableTo: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppAmenityFacilityCategory(row: AmenityFacilityCategoryRow): AmenityFacilityCategory {
  return {
    id: String(row.amenityFacilityCategoryId),
    categoryKey: row.amenityFacilityCategoryId,
    code: row.categoryCode,
    name: row.categoryName,
    applicableTo: row.applicableTo as ApplicableTo,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
