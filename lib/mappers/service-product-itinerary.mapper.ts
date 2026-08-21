import type { ServiceProductItinerary } from "@/types";

export interface ServiceProductItineraryRow {
  serviceProductItineraryId: bigint | number;
  serviceProductId: bigint | number;
  parentServiceProductItineraryId: bigint | number | null;
  dayNumber: number | null;
  sequenceNumber: number;
  title: string;
  description: string | null;
  durationValue: unknown;
  durationUnitId: bigint | number | null;
  startTime: Date | string | null;
  endTime: Date | string | null;
  serviceProductLocationId: bigint | number | null;
  isOvernight: boolean;
  isOptional: boolean;
  isHighlight: boolean;
  displayOrder: number;
  commonStatusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  parent?: { title: string } | null;
  durationUnit?: { durationUnitName: string } | null;
  location?: { locationName: string } | null;
  commonStatus?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toTimeOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : iso.slice(11, 16);
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function toAppServiceProductItinerary(row: ServiceProductItineraryRow): ServiceProductItinerary {
  return {
    serviceProductItineraryId: Number(row.serviceProductItineraryId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    parentServiceProductItineraryId:
      row.parentServiceProductItineraryId != null ? Number(row.parentServiceProductItineraryId) : null,
    parentTitle: row.parent?.title ?? undefined,
    dayNumber: row.dayNumber,
    sequenceNumber: row.sequenceNumber,
    title: row.title,
    description: row.description,
    durationValue: toNumberOrNull(row.durationValue),
    durationUnitId: row.durationUnitId != null ? Number(row.durationUnitId) : null,
    durationUnitName: row.durationUnit?.durationUnitName ?? undefined,
    startTime: toTimeOnly(row.startTime),
    endTime: toTimeOnly(row.endTime),
    serviceProductLocationId: row.serviceProductLocationId != null ? Number(row.serviceProductLocationId) : null,
    locationName: row.location?.locationName ?? undefined,
    isOvernight: row.isOvernight,
    isOptional: row.isOptional,
    isHighlight: row.isHighlight,
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
