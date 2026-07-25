/** Global Airline master (Super Admin / Tenant Configuration). */
export interface Airline {
  airlineId: number;
  airlineTypeId: number;
  airlineCode: string;
  airlineName: string;
  airlineNumericCode: number | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  pnrMaxDigit: number;
  tktMaxDigit: number;
  isTktNumberOnly: boolean;
  /** Populated when API joins AirlineType. */
  airlineTypeName?: string;
}
