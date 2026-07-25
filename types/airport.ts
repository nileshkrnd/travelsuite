/** Global Airport master (Super Admin / Tenant Configuration). ParentAirportID 0 = none. */
export interface Airport {
  airportId: number;
  airportCode: string;
  airportName: string;
  countryId: number;
  cityId: number;
  parentAirportId: number;
  latitude: string | null;
  longitude: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdDtTm: string | null;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  countryName?: string;
  cityName?: string;
  parentAirportCode?: string | null;
}