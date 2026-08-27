/** An identity document (Passport, National ID, …) attached to a Property Tenant, with verification status. */
export interface PropertyTenantDocument {
  propertyTenantDocumentId: number;
  propertyTenantId: number;
  identityDocumentCountryId: number;
  documentDisplayName?: string;
  documentShortName?: string;
  documentNumber: string;
  /** YYYY-MM-DD */
  issueDate: string | null;
  /** YYYY-MM-DD */
  expiryDate: string | null;
  documentFileUrl: string | null;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedDtTm: string | null;
  verifiedBy: number | null;
  statusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
