export interface B2BCustomerContact {
  b2bCustomerContactId: number;
  b2bCustomerId: number;
  contactTypeId: number;
  contactTypeName?: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  email: string | null;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

export interface B2BCustomerAddress {
  b2bCustomerAddressId: number;
  b2bCustomerId: number;
  addressTypeId: number;
  addressTypeName?: string;
  addressLine1: string;
  addressLine2: string | null;
  area: string | null;
  countryId: number;
  countryName?: string;
  stateId: number | null;
  stateName?: string;
  cityId: number | null;
  cityName?: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  isActive: boolean;
}

export interface B2BCustomerDocument {
  b2bCustomerDocumentId: number;
  b2bCustomerId: number;
  documentTypeId: number;
  documentTypeName?: string;
  documentNumber: string;
  issuingCountryId: number | null;
  issuingCountryName?: string;
  issueDate: string | null;
  expiryDate: string | null;
  documentFileId: number | null;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedBy: number | null;
  verifiedDtTm: string | null;
  statusId: number;
  statusName?: string;
  remarks: string | null;
  isActive: boolean;
}

export interface B2BCustomerCredit {
  b2bCustomerCreditId: number;
  b2bCustomerId: number;
  creditLimit: number;
  creditDays: number;
  paymentTermId: number | null;
  paymentTermName?: string;
  b2bCustomerCreditStatusId: number;
  creditStatusName?: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  approvedBy: number | null;
  approvedDtTm: string | null;
  remarks: string | null;
  isActive: boolean;
}
