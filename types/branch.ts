export type BranchStatus = "active" | "inactive";

/** Branch master — scoped by CompanyID (a company's operating branches). */
export interface Branch {
  id: string;
  /** Numeric BranchID. */
  branchKey: number;
  /** App tenant uid. */
  tenantId: string;
  /** Numeric TenantID. */
  tenantKey: number;
  /** App company uid. */
  companyId: string;
  /** Numeric CompanyID. */
  companyKey: number;
  branchTypeId: number;
  name: string;
  address1: string;
  address2: string;
  countryId: number;
  cityId: number;
  zipCode: string;
  contactPerson: string;
  emailAddress: string;
  countryDialCode: string;
  phoneNumber: string;
  faxNumber: string | null;
  isActive: boolean;
  status: BranchStatus;
  createdBy: number | null;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  branchTypeName?: string;
  companyName?: string;
  countryName?: string;
  cityName?: string;
}
