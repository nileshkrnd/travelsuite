/** Market include/exclude rule for a Service Product — restricts or opens sale to a Country, Region, City, or Market Group. */
export interface ServiceProductMarketRule {
  serviceProductMarketRuleId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductSupplierId: number | null;
  supplierName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  marketTypeId: number;
  marketTypeName?: string;
  marketTypeCode?: string;
  regionId: number | null;
  regionName?: string;
  countryId: number | null;
  countryName?: string;
  cityId: number | null;
  cityName?: string;
  marketGroupId: number | null;
  marketGroupName?: string;
  ruleTypeId: number;
  ruleTypeName?: string;
  ruleTypeCode?: string;
  fromDate: string | null;
  toDate: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
