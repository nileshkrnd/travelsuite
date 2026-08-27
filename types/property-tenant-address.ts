/** A postal/registered address for a Property Tenant (Home, Work, Registered Office, Mailing, …). */
export interface PropertyTenantAddress {
  propertyTenantAddressId: number;
  propertyTenantId: number;
  propertyTenantAddressTypeId: number;
  addressTypeName?: string;
  addressLine1: string;
  addressLine2: string | null;
  area: string | null;
  countryId: number;
  countryName?: string;
  stateId: number | null;
  stateName?: string;
  cityId: number | null;
  cityName?: string;
  postalCode: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
