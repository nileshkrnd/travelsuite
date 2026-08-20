import type { ServiceProductLocationType } from "@/types";

export interface ServiceProductLocationTypeRow {
  serviceProductLocationTypeId: bigint | number;
  locationTypeCode: string;
  locationTypeName: string;
  description: string | null;
  isPickupLocation: boolean;
  isDropoffLocation: boolean;
  isMeetingPoint: boolean;
  isDestination: boolean;
  displayOrder: number;
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

export function toAppServiceProductLocationType(row: ServiceProductLocationTypeRow): ServiceProductLocationType {
  return {
    serviceProductLocationTypeId: Number(row.serviceProductLocationTypeId),
    locationTypeCode: row.locationTypeCode,
    locationTypeName: row.locationTypeName,
    description: row.description,
    isPickupLocation: row.isPickupLocation,
    isDropoffLocation: row.isDropoffLocation,
    isMeetingPoint: row.isMeetingPoint,
    isDestination: row.isDestination,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
