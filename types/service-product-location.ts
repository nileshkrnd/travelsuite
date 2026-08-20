/** A physical location tied to a Service Product — pickup point, meeting point, destination, venue, … */
export interface ServiceProductLocation {
  serviceProductLocationId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductLocationTypeId: number;
  locationTypeName?: string;
  countryId: number;
  countryName?: string;
  regionId: number | null;
  regionName?: string;
  cityId: number | null;
  cityName?: string;
  areaId: number | null;
  areaName?: string;
  locationName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  googleMapUrl: string | null;
  locationInstructions: string | null;
  isPrimary: boolean;
  displayOrder: number;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
