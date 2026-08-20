import type { ServiceProductSupplierLocation } from "@/types";

export interface ServiceProductSupplierLocationRow {
  serviceProductSupplierLocationId: bigint | number;
  serviceProductSupplierId: bigint | number;
  serviceProductLocationId: bigint | number | null;
  serviceProductLocationTypeId: bigint | number;
  countryId: number;
  regionId: number | null;
  cityId: number | null;
  areaId: number | null;
  supplierLocationCode: string | null;
  supplierLocationName: string;
  supplierLocationReference: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  latitude: unknown;
  longitude: unknown;
  supplierGooglePlaceId: string | null;
  locationInstructions: string | null;
  isPickupAvailable: boolean;
  isDropoffAvailable: boolean;
  isMeetingPoint: boolean;
  isPrimary: boolean;
  isAvailable: boolean;
  displayOrder: number;
  commonStatusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  supplierLink?: { supplier?: { supplierName: string } | null } | null;
  location?: { locationName: string } | null;
  locationType?: { locationTypeName: string } | null;
  country?: { countryName: string } | null;
  region?: { regionName: string } | null;
  city?: { cityName: string } | null;
  area?: { areaName: string } | null;
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

export function toAppServiceProductSupplierLocation(
  row: ServiceProductSupplierLocationRow
): ServiceProductSupplierLocation {
  return {
    serviceProductSupplierLocationId: Number(row.serviceProductSupplierLocationId),
    serviceProductSupplierId: Number(row.serviceProductSupplierId),
    supplierName: row.supplierLink?.supplier?.supplierName ?? undefined,
    serviceProductLocationId: row.serviceProductLocationId != null ? Number(row.serviceProductLocationId) : null,
    serviceProductLocationName: row.location?.locationName ?? undefined,
    serviceProductLocationTypeId: Number(row.serviceProductLocationTypeId),
    locationTypeName: row.locationType?.locationTypeName ?? undefined,
    countryId: row.countryId,
    countryName: row.country?.countryName ?? undefined,
    regionId: row.regionId,
    regionName: row.region?.regionName ?? undefined,
    cityId: row.cityId,
    cityName: row.city?.cityName ?? undefined,
    areaId: row.areaId,
    areaName: row.area?.areaName ?? undefined,
    supplierLocationCode: row.supplierLocationCode,
    supplierLocationName: row.supplierLocationName,
    supplierLocationReference: row.supplierLocationReference,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    supplierGooglePlaceId: row.supplierGooglePlaceId,
    locationInstructions: row.locationInstructions,
    isPickupAvailable: row.isPickupAvailable,
    isDropoffAvailable: row.isDropoffAvailable,
    isMeetingPoint: row.isMeetingPoint,
    isPrimary: row.isPrimary,
    isAvailable: row.isAvailable,
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
