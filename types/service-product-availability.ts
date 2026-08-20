/** One day-of-week toggle within a Service Product Availability window. */
export interface ServiceProductAvailabilityDay {
  dayOfWeekId: number;
  dayOfWeekName?: string;
  isAvailable: boolean;
}

/** A booking/service date window for a Service Product, optionally scoped to an Option/Variant. */
export interface ServiceProductAvailability {
  serviceProductAvailabilityId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  bookingFromDate: string | null;
  bookingToDate: string | null;
  serviceFromDate: string | null;
  serviceToDate: string | null;
  isAvailable: boolean;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  days: ServiceProductAvailabilityDay[];
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
