import type { ServiceTypeConfiguration } from "@/types";

export interface ServiceTypeConfigurationRow {
  serviceTypeConfigurationId: bigint | number;
  serviceTypeId: bigint | number;
  isDurationApplicable: boolean;
  isBookingModelApplicable: boolean;
  isPricingModelApplicable: boolean;
  isPaxApplicable: boolean;
  isAgeApplicable: boolean;
  isPickupApplicable: boolean;
  isDropoffApplicable: boolean;
  isScheduleApplicable: boolean;
  isAvailabilityApplicable: boolean;
  isItineraryApplicable: boolean;
  isCancellationApplicable: boolean;
  isOnlineSellable: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number | null;
  companyId: number | null;
  serviceType?: { serviceTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceTypeConfiguration(row: ServiceTypeConfigurationRow): ServiceTypeConfiguration {
  return {
    serviceTypeConfigurationId: Number(row.serviceTypeConfigurationId),
    serviceTypeId: Number(row.serviceTypeId),
    serviceTypeName: row.serviceType?.serviceTypeName ?? undefined,
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
