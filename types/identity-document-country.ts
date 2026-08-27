/** Per-country naming/issuing-authority for an identity document type (e.g. Qatar National ID = "Qatar ID" / QID). */
export interface IdentityDocumentCountry {
  identityDocumentCountryId: number;
  identityDocumentTypeId: number;
  documentTypeName?: string;
  countryId: number;
  countryName?: string;
  documentDisplayName: string;
  documentShortName: string | null;
  issuingAuthority: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
