export type CompanyStatus = "active" | "inactive";

/** Company master — scoped by TenantID (numeric). */
export interface Company {
  id: string;
  /** Numeric CompanyID. */
  companyKey: number;
  /** App tenant uid. */
  tenantId: string;
  /** Numeric TenantID. */
  tenantKey: number;
  companyGroupId: number | null;
  code: string;
  name: string;
  address1: string;
  address2: string;
  countryId: number;
  cityId: number;
  currencyId: number;
  zipCode: string;
  countryDialCode: string;
  contactNumber: string | null;
  fax: string | null;
  contactPerson: string | null;
  emailAddress: string | null;
  isActive: boolean;
  status: CompanyStatus;
  isRoundOff: boolean;
  noOfSignificantDigits: number;
  isDisplayNumberInThousands: boolean | null;
  companyLogo: string;
  companyFavIcon: string;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  countryName?: string;
  cityName?: string;
  currencyCode?: string;
}
