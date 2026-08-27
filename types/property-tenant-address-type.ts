/** Address type master — Home, Work, Registered Office, Mailing. */
export interface PropertyTenantAddressType {
  propertyTenantAddressTypeId: number;
  addressTypeCode: string;
  addressTypeName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
