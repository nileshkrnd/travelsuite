/** A time slot / departure schedule within a Service Product Availability window. */
export interface ServiceProductSchedule {
  serviceProductScheduleId: number;
  serviceProductAvailabilityId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  dayOfWeekId: number | null;
  dayOfWeekName?: string;
  /** "HH:MM" 24-hour, or null. */
  startTime: string | null;
  /** "HH:MM" 24-hour, or null. */
  endTime: string | null;
  capacity: number | null;
  isAvailable: boolean;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
