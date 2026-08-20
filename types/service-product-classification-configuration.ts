/**
 * One configuration row per Service Product Classification — overrides the parent
 * Service Type's configuration. `null` on a flag means "inherit the Service Type's setting".
 */
export interface ServiceProductClassificationConfiguration {
  serviceProductClassificationConfigurationId: number;
  serviceProductClassificationId: number;
  classificationName?: string;
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
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number | null;
  companyId: number | null;
}
