/** Global State/Province master — belongs to a Country only. */
export interface State {
  id: string;
  stateKey: number;
  countryKey: number;
  countryCode: string;
  code: string;
  isoCode: string | null;
  name: string;
  nativeName: string | null;
  administrativeTypeKey: number | null;
  administrativeTypeName?: string;
  capitalCityKey: number | null;
  capitalCityName?: string;
  latitude: number | null;
  longitude: number | null;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
}

/** State administrative type lookup (State, Province, Emirate, Governorate, Region). */
export interface StateAdministrativeType {
  id: string;
  typeKey: number;
  name: string;
  isActive: boolean;
}
