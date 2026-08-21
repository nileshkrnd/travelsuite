import type { ServiceProductConfiguration } from "@/types";

export interface ServiceProductConfigurationRow {
  serviceProductConfigurationId: bigint | number;
  serviceProductId: bigint | number;
  durationValue: string | null;
  durationUnitId: bigint | number | null;
  bookingModelId: bigint | number | null;
  pricingModelId: bigint | number | null;
  minimumPax: number | null;
  maximumPax: number | null;
  minimumAge: number | null;
  maximumAge: number | null;
  isInstantConfirmation: boolean;
  isRequestOnly: boolean;
  isDateRequired: boolean;
  isTimeRequired: boolean;
  isPickupRequired: boolean;
  isDropoffRequired: boolean;
  isScheduleRequired: boolean;
  isAvailabilityRequired: boolean;
  isItineraryRequired: boolean;
  isCancellationPolicyRequired: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  durationUnit?: { durationUnitName: string } | null;
  bookingModel?: { bookingModelName: string } | null;
  pricingModel?: { pricingModelName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductConfiguration(row: ServiceProductConfigurationRow): ServiceProductConfiguration {
  return {
    serviceProductConfigurationId: Number(row.serviceProductConfigurationId),
    serviceProductId: Number(row.serviceProductId),
    durationValue: row.durationValue,
    durationUnitId: row.durationUnitId != null ? Number(row.durationUnitId) : null,
    durationUnitName: row.durationUnit?.durationUnitName ?? undefined,
    bookingModelId: row.bookingModelId != null ? Number(row.bookingModelId) : null,
    bookingModelName: row.bookingModel?.bookingModelName ?? undefined,
    pricingModelId: row.pricingModelId != null ? Number(row.pricingModelId) : null,
    pricingModelName: row.pricingModel?.pricingModelName ?? undefined,
    minimumPax: row.minimumPax,
    maximumPax: row.maximumPax,
    minimumAge: row.minimumAge,
    maximumAge: row.maximumAge,
    isInstantConfirmation: row.isInstantConfirmation,
    isRequestOnly: row.isRequestOnly,
    isDateRequired: row.isDateRequired,
    isTimeRequired: row.isTimeRequired,
    isPickupRequired: row.isPickupRequired,
    isDropoffRequired: row.isDropoffRequired,
    isScheduleRequired: row.isScheduleRequired,
    isAvailabilityRequired: row.isAvailabilityRequired,
    isItineraryRequired: row.isItineraryRequired,
    isCancellationPolicyRequired: row.isCancellationPolicyRequired,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
