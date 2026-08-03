/** Global Location master — a subdivision of an Area. */
export interface Location {
  id: string;
  locationKey: number;
  countryKey: number;
  countryCode: string;
  stateKey: number | null;
  stateName?: string;
  cityKey: number;
  cityName: string;
  areaKey: number;
  areaName: string;
  code: string;
  name: string;
  nativeName: string | null;
  locationTypeKey: number | null;
  locationTypeName?: string;
  zoneNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  displayOrder: number;
  isPopular: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
}

/** Location type lookup (Neighborhood, Street, District, …). */
export interface LocationType {
  id: string;
  typeKey: number;
  name: string;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
