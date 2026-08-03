import type { City, Country, Currency, CurrencyStatus, ReferenceStatus, State, StateAdministrativeType } from "@/types";

export interface CountryRow {
  countryId: number;
  countryCode: string;
  countryName: string;
  dialCode: string;
  status: string;
  createdDtTm: Date | string;
}

export interface CityRow {
  cityId: number;
  countryId: number;
  cityCode: string;
  cityName: string;
  status: string;
  createdDtTm: Date | string;
  country?: { countryCode: string } | null;
}

export interface StateRow {
  stateId: number;
  countryId: number;
  stateCode: string;
  isoCode: string | null;
  stateName: string;
  nativeName: string | null;
  stateAdministrativeTypeId: number | null;
  capitalCityId: number | null;
  latitude: unknown;
  longitude: unknown;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdDtTm: Date | string;
  country?: { countryCode: string } | null;
  administrativeType?: { administrativeType: string } | null;
  capitalCity?: { cityName: string } | null;
}

export interface StateAdministrativeTypeRow {
  stateAdministrativeTypeId: number;
  administrativeType: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  isDeleted: boolean;
}

export interface CurrencyRow {
  currencyId: number;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  smallCurrencyName: string;
  significantDigit: number;
  status: string;
  createdDtTm: Date | string;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function toStatus(value: string): ReferenceStatus {
  return value === "inactive" ? "inactive" : "active";
}

export function toAppCountry(row: CountryRow): Country {
  return {
    id: `country_${row.countryCode.toLowerCase()}`,
    countryKey: row.countryId,
    code: row.countryCode,
    name: row.countryName,
    dialCode: row.dialCode,
    status: toStatus(row.status),
    createdAt: toIso(row.createdDtTm),
  };
}

export function toAppCity(row: CityRow): City {
  const countryCode = row.country?.countryCode ?? "";
  return {
    id: `city_${row.cityId}`,
    cityKey: row.cityId,
    countryKey: row.countryId,
    countryCode,
    code: row.cityCode,
    name: row.cityName,
    status: toStatus(row.status),
    createdAt: toIso(row.createdDtTm),
  };
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function toAppState(row: StateRow): State {
  const countryCode = row.country?.countryCode ?? "";
  return {
    id: `state_${row.stateId}`,
    stateKey: row.stateId,
    countryKey: row.countryId,
    countryCode,
    code: row.stateCode,
    isoCode: row.isoCode,
    name: row.stateName,
    nativeName: row.nativeName,
    administrativeTypeKey: row.stateAdministrativeTypeId,
    administrativeTypeName: row.administrativeType?.administrativeType,
    capitalCityKey: row.capitalCityId,
    capitalCityName: row.capitalCity?.cityName,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isDeleted: row.isDeleted,
    createdAt: toIso(row.createdDtTm),
  };
}

export function toAppStateAdministrativeType(row: StateAdministrativeTypeRow): StateAdministrativeType {
  return {
    id: `sat_${row.stateAdministrativeTypeId}`,
    typeKey: row.stateAdministrativeTypeId,
    name: row.administrativeType,
    isActive: row.isActive,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm == null ? null : toIso(row.modifiedDtTm),
  };
}

export function toAppCurrency(row: CurrencyRow): Currency {
  return {
    id: `currency_${row.currencyCode.toLowerCase()}`,
    currencyKey: row.currencyId,
    code: row.currencyCode,
    name: row.currencyName,
    symbol: row.symbol || "",
    smallCurrencyName: row.smallCurrencyName,
    significantDigit: row.significantDigit,
    status: toStatus(row.status) as CurrencyStatus,
    createdAt: toIso(row.createdDtTm),
  };
}
