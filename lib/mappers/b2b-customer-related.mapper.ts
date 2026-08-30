import type {
  B2BCustomerAddress,
  B2BCustomerContact,
  B2BCustomerCredit,
  B2BCustomerDocument,
} from "@/types";

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function toNum(value: { toString(): string } | number | string | null | undefined): number | null {
  if (value == null) return null;
  return Number(value.toString());
}

export function toAppB2BCustomerContact(row: {
  b2bCustomerContactId: bigint | number;
  b2bCustomerId: bigint | number;
  contactTypeId: bigint | number;
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
  contactType?: { contactTypeName: string } | null;
}): B2BCustomerContact {
  return {
    b2bCustomerContactId: Number(row.b2bCustomerContactId),
    b2bCustomerId: Number(row.b2bCustomerId),
    contactTypeId: Number(row.contactTypeId),
    contactTypeName: row.contactType?.contactTypeName,
    firstName: row.firstName,
    lastName: row.lastName,
    designation: row.designation,
    email: row.email,
    mobileCountryCode: row.mobileCountryCode,
    mobileNumber: row.mobileNumber,
    phoneCountryCode: row.phoneCountryCode,
    phoneNumber: row.phoneNumber,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
  };
}

export function toAppB2BCustomerAddress(row: {
  b2bCustomerAddressId: bigint | number;
  b2bCustomerId: bigint | number;
  addressTypeId: bigint | number;
  addressLine1: string;
  addressLine2: string | null;
  area: string | null;
  countryId: number;
  stateId: number | null;
  cityId: number | null;
  postalCode: string | null;
  latitude: { toString(): string } | number | string | null;
  longitude: { toString(): string } | number | string | null;
  isPrimary: boolean;
  isActive: boolean;
  addressType?: { addressTypeName: string } | null;
  country?: { countryName: string } | null;
  state?: { stateName: string } | null;
  city?: { cityName: string } | null;
}): B2BCustomerAddress {
  return {
    b2bCustomerAddressId: Number(row.b2bCustomerAddressId),
    b2bCustomerId: Number(row.b2bCustomerId),
    addressTypeId: Number(row.addressTypeId),
    addressTypeName: row.addressType?.addressTypeName,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    area: row.area,
    countryId: row.countryId,
    countryName: row.country?.countryName,
    stateId: row.stateId,
    stateName: row.state?.stateName,
    cityId: row.cityId,
    cityName: row.city?.cityName,
    postalCode: row.postalCode,
    latitude: toNum(row.latitude),
    longitude: toNum(row.longitude),
    isPrimary: row.isPrimary,
    isActive: row.isActive,
  };
}

export function toAppB2BCustomerDocument(row: {
  b2bCustomerDocumentId: bigint | number;
  b2bCustomerId: bigint | number;
  documentTypeId: bigint | number;
  documentNumber: string;
  issuingCountryId: number | null;
  issueDate: Date | string | null;
  expiryDate: Date | string | null;
  documentFileId: bigint | number | null;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedBy: number | null;
  verifiedDtTm: Date | string | null;
  statusId: bigint | number;
  remarks: string | null;
  isActive: boolean;
  documentType?: { documentTypeName: string } | null;
  issuingCountry?: { countryName: string } | null;
  status?: { statusName: string } | null;
}): B2BCustomerDocument {
  return {
    b2bCustomerDocumentId: Number(row.b2bCustomerDocumentId),
    b2bCustomerId: Number(row.b2bCustomerId),
    documentTypeId: Number(row.documentTypeId),
    documentTypeName: row.documentType?.documentTypeName,
    documentNumber: row.documentNumber,
    issuingCountryId: row.issuingCountryId,
    issuingCountryName: row.issuingCountry?.countryName,
    issueDate: toDateOnly(row.issueDate),
    expiryDate: toDateOnly(row.expiryDate),
    documentFileId: row.documentFileId != null ? Number(row.documentFileId) : null,
    isPrimary: row.isPrimary,
    isVerified: row.isVerified,
    verifiedBy: row.verifiedBy,
    verifiedDtTm: toIso(row.verifiedDtTm),
    statusId: Number(row.statusId),
    statusName: row.status?.statusName,
    remarks: row.remarks,
    isActive: row.isActive,
  };
}

export function toAppB2BCustomerCredit(row: {
  b2bCustomerCreditId: bigint | number;
  b2bCustomerId: bigint | number;
  creditLimit: { toString(): string } | number | string;
  creditDays: number;
  paymentTermId: bigint | number | null;
  b2bCustomerCreditStatusId: bigint | number;
  effectiveFrom: Date | string;
  effectiveTo: Date | string | null;
  approvedBy: number | null;
  approvedDtTm: Date | string | null;
  remarks: string | null;
  isActive: boolean;
  paymentTerm?: { paymentTermName: string } | null;
  creditStatus?: { creditStatusName: string } | null;
}): B2BCustomerCredit {
  return {
    b2bCustomerCreditId: Number(row.b2bCustomerCreditId),
    b2bCustomerId: Number(row.b2bCustomerId),
    creditLimit: Number(row.creditLimit.toString()),
    creditDays: row.creditDays,
    paymentTermId: row.paymentTermId != null ? Number(row.paymentTermId) : null,
    paymentTermName: row.paymentTerm?.paymentTermName,
    b2bCustomerCreditStatusId: Number(row.b2bCustomerCreditStatusId),
    creditStatusName: row.creditStatus?.creditStatusName,
    effectiveFrom: toDateOnly(row.effectiveFrom) ?? "",
    effectiveTo: toDateOnly(row.effectiveTo),
    approvedBy: row.approvedBy,
    approvedDtTm: toIso(row.approvedDtTm),
    remarks: row.remarks,
    isActive: row.isActive,
  };
}
