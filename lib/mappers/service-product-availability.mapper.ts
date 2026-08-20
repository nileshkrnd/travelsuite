import type { ServiceProductAvailability } from "@/types";

export interface ServiceProductAvailabilityRow {
  serviceProductAvailabilityId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  bookingFromDate: Date | string | null;
  bookingToDate: Date | string | null;
  serviceFromDate: Date | string | null;
  serviceToDate: Date | string | null;
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
  commonStatus?: { statusName: string } | null;
  days?: { dayOfWeekId: bigint | number; isAvailable: boolean; dayOfWeek?: { dayOfWeekName: string } | null }[];
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function toAppServiceProductAvailability(row: ServiceProductAvailabilityRow): ServiceProductAvailability {
  return {
    serviceProductAvailabilityId: Number(row.serviceProductAvailabilityId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.option?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.variant?.variantName ?? undefined,
    bookingFromDate: toDateOnly(row.bookingFromDate),
    bookingToDate: toDateOnly(row.bookingToDate),
    serviceFromDate: toDateOnly(row.serviceFromDate),
    serviceToDate: toDateOnly(row.serviceToDate),
    isAvailable: row.isAvailable,
    commonStatusId: Number(row.commonStatusId),
    statusName: row.commonStatus?.statusName ?? undefined,
    isActive: row.isActive,
    days: (row.days ?? []).map((d) => ({
      dayOfWeekId: Number(d.dayOfWeekId),
      dayOfWeekName: d.dayOfWeek?.dayOfWeekName ?? undefined,
      isAvailable: d.isAvailable,
    })),
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
