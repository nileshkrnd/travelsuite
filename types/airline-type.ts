/** Global Airline Type master (Super Admin / Tenant Configuration). */
export interface AirlineType {
  airlineTypeId: number;
  airlineTypeName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
