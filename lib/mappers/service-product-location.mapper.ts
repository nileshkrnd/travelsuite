import type { ServiceProductLocation } from "@/types";

export interface ServiceProductLocationRow {
  serviceProductLocationId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductLocationTypeId: bigint | number;
  countryId: number;
  regionId: number | null;
  cityId: number | null;
  areaId: number | null;
  locationName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  latitude: unknown;
  longitude: unknown;
  googlePlaceId: string | null;
  googleMapUrl: string | null;
  locationInstructions: string | null;
  isPrimary: boolean;
  displayOrder: number;
  commonStatusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
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

export function toAppServiceProductLocation(row: ServiceProductLocationRow): ServiceProductLocation {
  return {
    serviceProductLocationId: Number(row.serviceProductLocationId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
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
    locationName: row.locationName,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    googlePlaceId: row.googlePlaceId,
    googleMapUrl: row.googleMapUrl,
    locationInstructions: row.locationInstructions,
    isPrimary: row.isPrimary,
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
