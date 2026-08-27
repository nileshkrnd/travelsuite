/** Identity document type master — National ID, Passport, Residence Permit, Driving License, Other. */
export interface IdentityDocumentType {
  identityDocumentTypeId: number;
  documentTypeCode: string;
  documentTypeName: string;
  description: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
