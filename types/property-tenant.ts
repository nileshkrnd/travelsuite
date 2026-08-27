/** A person or organization occupying/leasing a property — KYC profile. */
export interface PropertyTenant {
  propertyTenantId: number;
  tenantId: number;
  companyId: number;
  tenantCode: string;
  propertyTenantTypeId: number;
  tenantTypeName?: string;
  tenantName: string;
  legalName: string | null;
  registrationNumber: string | null;
  taxRegistrationNumber: string | null;
  nationalityId: number | null;
  nationalityName?: string;
  countryOfResidenceId: number | null;
  countryOfResidenceName?: string;
  countryId: number;
  countryName?: string;
  cityId: number | null;
  cityName?: string;
  contactPersonName: string | null;
  email: string | null;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  statusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
