/** Supplier org master — travel supply-side partner (Hotelier, DMC, Transport, Activity Provider, …). Tenant + Company scoped. */
export interface Supplier {
  id: string;
  supplierKey: number;
  tenantKey: number;
  companyKey: number;
  code: string;
  name: string;
  legalName: string;
  supplierTypeId: number;
  supplierTypeName?: string;
  registrationNumber: string | null;
  taxVatNumber: string | null;
  countryId: number;
  countryName?: string;
  stateId: number | null;
  stateName?: string;
  cityId: number;
  cityName?: string;
  address: string;
  postalCode: string | null;
  website: string | null;
  currencyId: number;
  currencyCode?: string;
  /** Client-side id from PropertyForm's static TIME_ZONES list — no DB FK. */
  timeZoneId: number;
  requiresExtranetAccess: boolean;
  isActive: boolean;
  companyName?: string;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
