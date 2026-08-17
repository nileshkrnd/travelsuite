export type TaxCalculationType = "PERCENTAGE" | "FIXED";

export interface Tax {
  id: string;
  taxKey: number;
  tenantKey: number | null;
  companyKey: number | null;
  taxTypeId: number;
  taxTypeCode?: string;
  taxTypeName?: string;
  taxCode: string;
  taxName: string;
  countryId: number | null;
  countryCode?: string;
  countryName?: string;
  regionId: number | null;
  regionCode?: string;
  regionName?: string;
  calculationType: TaxCalculationType;
  defaultRate: number | null;
  defaultAmount: number | null;
  currencyId: number | null;
  currencyCode?: string;
  applicationBasis: string;
  isInclusiveDefault: boolean;
  isCompound: boolean;
  /** YYYY-MM-DD */
  effectiveFrom: string | null;
  /** YYYY-MM-DD */
  effectiveTo: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface TaxWrite {
  tenantId?: number | null;
  companyId?: number | null;
  taxTypeId: number;
  taxCode: string;
  taxName: string;
  countryId?: number | null;
  regionId?: number | null;
  calculationType: TaxCalculationType;
  defaultRate?: number | null;
  defaultAmount?: number | null;
  currencyId?: number | null;
  applicationBasis: string;
  isInclusiveDefault?: boolean;
  isCompound?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean;
}
