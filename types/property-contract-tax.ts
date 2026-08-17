import type { TaxCalculationType } from "./tax";

export interface PropertyContractTax {
  id: string;
  propertyContractTaxKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  taxId: number;
  taxCode?: string;
  taxName: string;
  calculationType: TaxCalculationType;
  taxRate: number | null;
  taxAmount: number | null;
  currencyId: number | null;
  currencyCode?: string;
  applicationBasis: string;
  isInclusive: boolean;
  isCompound: boolean;
  sequenceNo: number;
  /** YYYY-MM-DD */
  fromDate: string;
  /** YYYY-MM-DD */
  toDate: string | null;
  isActive: boolean;
  remarks: string | null;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface PropertyContractTaxWrite {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  taxId: number;
  taxName: string;
  calculationType: TaxCalculationType;
  taxRate?: number | null;
  taxAmount?: number | null;
  currencyId?: number | null;
  applicationBasis: string;
  isInclusive?: boolean;
  isCompound?: boolean;
  sequenceNo?: number;
  fromDate: string;
  toDate?: string | null;
  isActive?: boolean;
  remarks?: string | null;
}
