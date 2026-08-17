import type { TaxType } from "@/types/tax-type";
import type { Tax, TaxCalculationType } from "@/types/tax";

export type TaxTypeRow = {
  taxTypeId: number;
  tenantId: number;
  companyId: number;
  taxTypeCode: string;
  taxTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type TaxRow = {
  taxId: number;
  tenantId: number | null;
  companyId: number | null;
  taxTypeId: number;
  taxCode: string;
  taxName: string;
  countryId: number | null;
  regionId: number | null;
  calculationType: string;
  defaultRate: number | null;
  defaultAmount: number | null;
  currencyId: number | null;
  applicationBasis: string;
  isInclusiveDefault: boolean;
  isCompound: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  taxTypeCode?: string;
  taxTypeName?: string;
  countryCode?: string;
  countryName?: string;
  regionCode?: string;
  regionName?: string;
  currencyCode?: string;
};

export function toAppTaxType(row: TaxTypeRow): TaxType {
  return {
    id: String(row.taxTypeId),
    taxTypeKey: row.taxTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    taxTypeCode: row.taxTypeCode,
    taxTypeName: row.taxTypeName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppTax(row: TaxRow): Tax {
  return {
    id: String(row.taxId),
    taxKey: row.taxId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    taxTypeId: row.taxTypeId,
    taxTypeCode: row.taxTypeCode,
    taxTypeName: row.taxTypeName,
    taxCode: row.taxCode,
    taxName: row.taxName,
    countryId: row.countryId,
    countryCode: row.countryCode,
    countryName: row.countryName,
    regionId: row.regionId,
    regionCode: row.regionCode,
    regionName: row.regionName,
    calculationType: row.calculationType as TaxCalculationType,
    defaultRate: row.defaultRate,
    defaultAmount: row.defaultAmount,
    currencyId: row.currencyId,
    currencyCode: row.currencyCode,
    applicationBasis: row.applicationBasis,
    isInclusiveDefault: row.isInclusiveDefault,
    isCompound: row.isCompound,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
