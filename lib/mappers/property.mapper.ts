import type { Property } from "@/types";

export interface PropertyRow {
  propertyId: number;
  tenantId: number;
  companyId: number;
  propertyCode: string;
  propertyTypeId: number;
  propertyCategoryId: number | null;
  propertyUsageId: number | null;
  ownershipTypeId: number | null;
  propertyBrandId: number | null;
  supplierId: number | null;
  openingDate: Date | string | null;
  closingDate: Date | string | null;
  rating: { toString(): string } | number | string | null;
  starRating: number | null;
  isFeatured: boolean;
  isPublished: boolean;
  isActive: boolean;
  createdBy: number | null;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  companyName?: string | null;
  propertyType?: { propertyTypeName: string } | null;
  propertyCategory?: { propertyCategoryName: string } | null;
  propertyUsage?: { propertyUsageName: string } | null;
  ownershipType?: { ownershipTypeName: string } | null;
  propertyBrand?: { propertyBrandName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function toNumber(value: { toString(): string } | number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function toAppProperty(row: PropertyRow): Property {
  return {
    propertyId: row.propertyId,
    tenantId: row.tenantId,
    companyId: row.companyId,
    propertyCode: row.propertyCode,
    propertyTypeId: row.propertyTypeId,
    propertyCategoryId: row.propertyCategoryId,
    propertyUsageId: row.propertyUsageId,
    ownershipTypeId: row.ownershipTypeId,
    propertyBrandId: row.propertyBrandId,
    supplierId: row.supplierId,
    openingDate: toDateOnly(row.openingDate),
    closingDate: toDateOnly(row.closingDate),
    rating: toNumber(row.rating),
    starRating: row.starRating,
    isFeatured: row.isFeatured,
    isPublished: row.isPublished,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    companyName: row.companyName ?? undefined,
    propertyTypeName: row.propertyType?.propertyTypeName,
    propertyCategoryName: row.propertyCategory?.propertyCategoryName,
    propertyUsageName: row.propertyUsage?.propertyUsageName,
    ownershipTypeName: row.ownershipType?.ownershipTypeName,
    propertyBrandName: row.propertyBrand?.propertyBrandName,
  };
}
