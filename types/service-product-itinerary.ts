/** Day-by-day itinerary stop for a Service Product — optionally nested under a parent stop, optionally tied to a canonical location. */
export interface ServiceProductItinerary {
  serviceProductItineraryId: number;
  serviceProductId: number;
  serviceProductName?: string;
  parentServiceProductItineraryId: number | null;
  parentTitle?: string;
  dayNumber: number | null;
  sequenceNumber: number;
  title: string;
  description: string | null;
  durationValue: number | null;
  durationUnitId: number | null;
  durationUnitName?: string;
  startTime: string | null;
  endTime: string | null;
  serviceProductLocationId: number | null;
  locationName?: string;
  isOvernight: boolean;
  isOptional: boolean;
  isHighlight: boolean;
  displayOrder: number;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
