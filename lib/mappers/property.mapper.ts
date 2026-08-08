import type {
  OwnershipType,
  Property,
  PropertyBrand,
  PropertyCategory,
  PropertyType,
  PropertyUsage,
} from "@/types";

export interface PropertyLookupRow {
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  [key: string]: unknown;
}

export interface PropertyRow {
  propertyId: number;
  tenantId: number | null;
  companyId: number | null;
  propertyCode: string;
  propertyName: string | null;
  propertyDisplayName: string | null;
  shortDescription: string | null;
  description: string | null;
  internalRemarks: string | null;
  propertyUsageId: number | null;
  ownershipTypeId: number | null;
  propertyBrandId: number | null;
  supplierId: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  buildingName: string | null;
  buildingNumber: string | null;
  streetName: string | null;
  streetNumber: string | null;
  zoneNumber: string | null;
  countryId: number;
  stateId: number | null;
  cityId: number | null;
  areaId: number | null;
  locationId: number | null;
  postalCode: string | null;
  poBox: string | null;
  landmark: string | null;
  latitude: { toString(): string } | number | string | null;
  longitude: { toString(): string } | number | string | null;
  googlePlaceId: string | null;
  googleMapUrl: string | null;
  plusCode: string | null;
  timeZoneId: number | null;
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
  typeLinks?: Array<{
    propertyTypeId: number;
    propertyType?: { propertyTypeName: string } | null;
  }>;
  categoryLinks?: Array<{
    propertyCategoryId: number;
    propertyCategory?: { propertyCategoryName: string } | null;
  }>;
  propertyUsage?: { propertyUsageName: string } | null;
  ownershipType?: { ownershipTypeName: string } | null;
  propertyBrand?: { propertyBrandName: string } | null;
  country?: { countryName: string } | null;
  city?: { cityName: string } | null;
  media?: Array<{ mediaUrl: string }>;
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
  const typeLinks = row.typeLinks ?? [];
  const categoryLinks = row.categoryLinks ?? [];
  return {
    propertyId: row.propertyId,
    tenantId: row.tenantId,
    companyId: row.companyId,
    propertyCode: row.propertyCode,
    propertyName: row.propertyName,
    propertyDisplayName: row.propertyDisplayName,
    shortDescription: row.shortDescription,
    description: row.description,
    internalRemarks: row.internalRemarks,
    propertyTypeIds: typeLinks.map((l) => l.propertyTypeId),
    propertyCategoryIds: categoryLinks.map((l) => l.propertyCategoryId),
    propertyUsageId: row.propertyUsageId,
    ownershipTypeId: row.ownershipTypeId,
    propertyBrandId: row.propertyBrandId,
    supplierId: row.supplierId,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    buildingName: row.buildingName,
    buildingNumber: row.buildingNumber,
    streetName: row.streetName,
    streetNumber: row.streetNumber,
    zoneNumber: row.zoneNumber,
    countryId: row.countryId,
    stateId: row.stateId,
    cityId: row.cityId,
    areaId: row.areaId,
    locationId: row.locationId,
    postalCode: row.postalCode,
    poBox: row.poBox,
    landmark: row.landmark,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    googlePlaceId: row.googlePlaceId,
    googleMapUrl: row.googleMapUrl,
    plusCode: row.plusCode,
    timeZoneId: row.timeZoneId,
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
    propertyTypeNames: typeLinks
      .map((l) => l.propertyType?.propertyTypeName)
      .filter((n): n is string => !!n),
    propertyCategoryNames: categoryLinks
      .map((l) => l.propertyCategory?.propertyCategoryName)
      .filter((n): n is string => !!n),
    propertyUsageName: row.propertyUsage?.propertyUsageName,
    ownershipTypeName: row.ownershipType?.ownershipTypeName,
    propertyBrandName: row.propertyBrand?.propertyBrandName,
    countryName: row.country?.countryName,
    cityName: row.city?.cityName,
    coverImageUrl: row.media?.[0]?.mediaUrl ?? null,
  };
}

function toGlobalNameLookup(row: PropertyLookupRow, idField: string, nameField: string): PropertyType {
  const key = Number(row[idField]);
  return {
    id: String(key),
    key,
    name: String(row[nameField] ?? ""),
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}

export const toAppPropertyType = (row: PropertyLookupRow): PropertyType =>
  toGlobalNameLookup(row, "propertyTypeId", "propertyTypeName");

export const toAppPropertyCategory = (row: PropertyLookupRow): PropertyCategory =>
  toGlobalNameLookup(row, "propertyCategoryId", "propertyCategoryName");

export const toAppPropertyUsage = (row: PropertyLookupRow): PropertyUsage =>
  toGlobalNameLookup(row, "propertyUsageId", "propertyUsageName");

export const toAppOwnershipType = (row: PropertyLookupRow): OwnershipType =>
  toGlobalNameLookup(row, "ownershipTypeId", "ownershipTypeName");

export const toAppPropertyBrand = (row: PropertyLookupRow): PropertyBrand =>
  toGlobalNameLookup(row, "propertyBrandId", "propertyBrandName");
