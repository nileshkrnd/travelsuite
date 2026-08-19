/** One configuration row per Service Type — which optional product attributes apply. */
export interface ServiceTypeConfiguration {
  serviceTypeConfigurationId: number;
  serviceTypeId: number;
  serviceTypeName?: string;
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
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number | null;
  companyId: number | null;
}
