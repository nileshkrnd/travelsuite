/** Location type lookup for Service Products — Destination, Pickup, Drop-off, Meeting Point, Airport, … Global. */
export interface ServiceProductLocationType {
  serviceProductLocationTypeId: number;
  locationTypeCode: string;
  locationTypeName: string;
  description: string | null;
  isPickupLocation: boolean;
  isDropoffLocation: boolean;
  isMeetingPoint: boolean;
  isDestination: boolean;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
