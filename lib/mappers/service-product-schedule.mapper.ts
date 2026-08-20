import type { ServiceProductSchedule } from "@/types";

export interface ServiceProductScheduleRow {
  serviceProductScheduleId: bigint | number;
  serviceProductAvailabilityId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  dayOfWeekId: bigint | number | null;
  startTime: Date | string | null;
  endTime: Date | string | null;
  capacity: number | null;
  isAvailable: boolean;
  commonStatusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  option?: { optionName: string } | null;
  variant?: { variantName: string } | null;
  dayOfWeek?: { dayOfWeekName: string } | null;
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

export function toAppServiceProductSchedule(row: ServiceProductScheduleRow): ServiceProductSchedule {
  return {
    serviceProductScheduleId: Number(row.serviceProductScheduleId),
    serviceProductAvailabilityId: Number(row.serviceProductAvailabilityId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.option?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.variant?.variantName ?? undefined,
    dayOfWeekId: row.dayOfWeekId != null ? Number(row.dayOfWeekId) : null,
    dayOfWeekName: row.dayOfWeek?.dayOfWeekName ?? undefined,
    startTime: toTimeOnly(row.startTime),
    endTime: toTimeOnly(row.endTime),
    capacity: row.capacity,
    isAvailable: row.isAvailable,
    commonStatusId: Number(row.commonStatusId),
    statusName: row.commonStatus?.statusName ?? undefined,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
