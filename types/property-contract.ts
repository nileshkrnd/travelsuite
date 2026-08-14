/** Supplier contract for a Property — rates/terms agreement, uploaded document, validity window. */
export interface PropertyContract {
  id: string;
  propertyContractKey: number;
  tenantKey: number;
  companyKey: number;
  propertyId: number;
  propertyName?: string;
  propertyCode?: string;
  countryName?: string;
  cityName?: string;
  supplierId: number;
  supplierName?: string;
  contractNumber: string;
  contractName: string;
  contractTypeId: number;
  contractTypeName?: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  contractCurrencyId: number;
  contractCurrencyCode?: string;
  contractStatusId: number;
  contractStatusName?: string;
  contractVersion: number;
  /** YYYY-MM-DD */
  signedDate: string | null;
  signedByEmployeeId: number | null;
  signedByEmployeeName?: string;
  supplierContactId: number | null;
  supplierContactName?: string;
  paymentTerms: string | null;
  generalTerms: string | null;
  remarks: string | null;
  contractFileUrl: string | null;
  contractFileName: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
