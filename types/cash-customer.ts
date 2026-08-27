/** Walk-in / retail cash customer — a person, not an organization. */
export interface CashCustomer {
  cashCustomerId: number;
  tenantId: number;
  companyId: number;
  cashCustomerCode: string;
  cashCustomerTypeId: number;
  customerTypeName?: string;
  customerName: string;
  firstName: string | null;
  lastName: string | null;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  email: string | null;
  countryId: number | null;
  countryName?: string;
  nationalityId: number | null;
  nationalityName?: string;
  currencyId: number;
  currencyCode?: string;
  statusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
