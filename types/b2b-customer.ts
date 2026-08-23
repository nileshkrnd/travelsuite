/** B2B customer master — Corporate / Sub-Agent accounts, optionally organized under a parent (head office/branch). */
export interface B2BCustomer {
  b2bCustomerId: number;
  tenantId: number;
  companyId: number;
  b2bCustomerCode: string;
  b2bCustomerName: string;
  b2bCustomerTypeId: number;
  customerTypeName?: string;
  b2bCustomerCategoryId: number | null;
  categoryName?: string;
  parentB2bCustomerId: number | null;
  parentB2bCustomerName?: string;
  registrationNumber: string | null;
  taxRegistrationNumber: string | null;
  countryId: number;
  countryName?: string;
  currencyId: number;
  currencyCode?: string;
  paymentTermId: number | null;
  paymentTermName?: string;
  creditLimit: number | null;
  creditDays: number | null;
  accountManagerId: number | null;
  accountManagerName?: string;
  statusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
