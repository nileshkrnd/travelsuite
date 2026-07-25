import type { City, Country, Currency, CurrencyStatus, ReferenceStatus } from "@/types";

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
