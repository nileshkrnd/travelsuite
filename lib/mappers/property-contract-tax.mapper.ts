import type { PropertyContractTax } from "@/types/property-contract-tax";
import type { TaxCalculationType } from "@/types/tax";

export type PropertyContractTaxRow = {
  propertyContractTaxId: number;
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  taxId: number;
  taxName: string;
  calculationType: string;
  taxRate: number | null;
  taxAmount: number | null;
  currencyId: number | null;
  applicationBasis: string;
  isInclusive: boolean;
  isCompound: boolean;
  sequenceNo: number;
  fromDate: string;
  toDate: string | null;
  isActive: boolean;
  remarks: string | null;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  contractNumber?: string;
  contractName?: string;
  taxCode?: string;
  currencyCode?: string;
};

export function toAppPropertyContractTax(row: PropertyContractTaxRow): PropertyContractTax {
  return {
    id: String(row.propertyContractTaxId),
    propertyContractTaxKey: row.propertyContractTaxId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: row.propertyContractId,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    taxId: row.taxId,
    taxCode: row.taxCode,
    taxName: row.taxName,
    calculationType: row.calculationType as TaxCalculationType,
    taxRate: row.taxRate,
    taxAmount: row.taxAmount,
    currencyId: row.currencyId,
    currencyCode: row.currencyCode,
    applicationBasis: row.applicationBasis,
    isInclusive: row.isInclusive,
    isCompound: row.isCompound,
    sequenceNo: row.sequenceNo,
    fromDate: row.fromDate,
    toDate: row.toDate,
    isActive: row.isActive,
    remarks: row.remarks,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
