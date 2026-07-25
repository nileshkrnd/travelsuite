import type { Airline, AirlineType, Airport } from "@/types";

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppAirlineType(row: {
  airlineTypeId: number;
  airlineTypeName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}): AirlineType {
  return {
    airlineTypeId: row.airlineTypeId,
    airlineTypeName: row.airlineTypeName,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}

export function toAppAirline(row: {
  airlineId: number;
  airlineTypeId: number;
  airlineCode: string;
  airlineName: string;
  airlineNumericCode: number | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  pnrMaxDigit: number;
  tktMaxDigit: number;
  isTktNumberOnly: boolean;
  airlineType?: { airlineTypeName: string } | null;
}): Airline {
  return {
    airlineId: row.airlineId,
    airlineTypeId: row.airlineTypeId,
    airlineCode: row.airlineCode,
    airlineName: row.airlineName,
    airlineNumericCode: row.airlineNumericCode,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    pnrMaxDigit: row.pnrMaxDigit,
    tktMaxDigit: row.tktMaxDigit,
    isTktNumberOnly: row.isTktNumberOnly,
    airlineTypeName: row.airlineType?.airlineTypeName,
  };
}

export function toAppAirport(row: {
  airportId: number;
  airportCode: string;
  airportName: string;
  countryId: number;
  cityId: number;
  parentAirportId: number;
  latitude: string | null;
  longitude: string | null;
  isActive: boolean | null;
  createdBy: number | null;
  createdDtTm: Date | string | null;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  country?: { countryName: string } | null;
  city?: { cityName: string } | null;
  parentAirportCode?: string | null;
}): Airport {
  return {
    airportId: row.airportId,
    airportCode: row.airportCode,
    airportName: row.airportName,
    countryId: row.countryId,
    cityId: row.cityId,
    parentAirportId: row.parentAirportId,
    latitude: row.latitude,
    longitude: row.longitude,
    isActive: row.isActive ?? true,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    countryName: row.country?.countryName,
    cityName: row.city?.cityName,
    parentAirportCode: row.parentAirportCode,
  };
}
