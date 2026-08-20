import type { ServiceProductClassificationConfiguration } from "@/types";

export interface ServiceProductClassificationConfigurationRow {
  serviceProductClassificationConfigurationId: bigint | number;
  serviceProductClassificationId: bigint | number;
  isDurationApplicable: boolean | null;
  isBookingModelApplicable: boolean | null;
  isPricingModelApplicable: boolean | null;
  isPaxApplicable: boolean | null;
  isAgeApplicable: boolean | null;
  isPickupApplicable: boolean | null;
  isDropoffApplicable: boolean | null;
  isScheduleApplicable: boolean | null;
  isAvailabilityApplicable: boolean | null;
  isItineraryApplicable: boolean | null;
  isCancellationApplicable: boolean | null;
  isOnlineSellable: boolean | null;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number | null;
  companyId: number | null;
  classification?: { classificationName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductClassificationConfiguration(
  row: ServiceProductClassificationConfigurationRow
): ServiceProductClassificationConfiguration {
  return {
    serviceProductClassificationConfigurationId: Number(row.serviceProductClassificationConfigurationId),
    serviceProductClassificationId: Number(row.serviceProductClassificationId),
    classificationName: row.classification?.classificationName ?? undefined,
    isDurationApplicable: row.isDurationApplicable,
    isBookingModelApplicable: row.isBookingModelApplicable,
    isPricingModelApplicable: row.isPricingModelApplicable,
    isPaxApplicable: row.isPaxApplicable,
    isAgeApplicable: row.isAgeApplicable,
    isPickupApplicable: row.isPickupApplicable,
    isDropoffApplicable: row.isDropoffApplicable,
    isScheduleApplicable: row.isScheduleApplicable,
    isAvailabilityApplicable: row.isAvailabilityApplicable,
    isItineraryApplicable: row.isItineraryApplicable,
    isCancellationApplicable: row.isCancellationApplicable,
    isOnlineSellable: row.isOnlineSellable,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    tenantId: row.tenantId,
    companyId: row.companyId,
  };
}
