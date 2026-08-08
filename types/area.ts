/** Global Area/Locality master — belongs to a City within a Country. */
export interface Area {
  id: string;
  areaKey: number;
  countryKey: number;
  countryCode: string;
  cityKey: number;
  cityName: string;
  code: string;
  name: string;
  nativeName: string | null;
  areaTypeKey: number | null;
  areaTypeName?: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  displayOrder: number;
  isPopular: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
}

/** Area type lookup (Residential, Commercial, Industrial, …). */
export interface AreaType {
  id: string;
  typeKey: number;
  code: string;
  name: string;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
