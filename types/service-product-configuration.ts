/** One configuration row per Service Product — duration/booking/pricing model and requirement flags. */
export interface ServiceProductConfiguration {
  serviceProductConfigurationId: number;
  serviceProductId: number;
  /** Free-text duration, e.g. "4 to 5 hours", "45 mins to 1 hour". */
  durationValue: string | null;
  durationUnitId: number | null;
  durationUnitName?: string;
  bookingModelId: number | null;
  bookingModelName?: string;
  pricingModelId: number | null;
  pricingModelName?: string;
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
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
