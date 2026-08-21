import type { ServiceProductMarketRule } from "@/types";

export interface ServiceProductMarketRuleRow {
  serviceProductMarketRuleId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductSupplierId: bigint | number | null;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  marketTypeId: bigint | number;
  regionId: number | null;
  countryId: number | null;
  cityId: number | null;
  marketGroupId: bigint | number | null;
  ruleTypeId: bigint | number;
  fromDate: Date | string | null;
  toDate: Date | string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  supplierLink?: { supplier: { supplierName: string } } | null;
  option?: { optionName: string } | null;
  variant?: { variantName: string } | null;
  marketType?: { marketTypeName: string; marketTypeCode: string } | null;
  region?: { regionName: string } | null;
  country?: { countryName: string } | null;
  city?: { cityName: string } | null;
  marketGroup?: { marketGroupName: string } | null;
  ruleType?: { ruleTypeName: string; ruleTypeCode: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

export function toAppServiceProductMarketRule(row: ServiceProductMarketRuleRow): ServiceProductMarketRule {
  return {
    serviceProductMarketRuleId: Number(row.serviceProductMarketRuleId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    supplierName: row.supplierLink?.supplier.supplierName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.option?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.variant?.variantName ?? undefined,
    marketTypeId: Number(row.marketTypeId),
    marketTypeName: row.marketType?.marketTypeName ?? undefined,
    marketTypeCode: row.marketType?.marketTypeCode ?? undefined,
    regionId: row.regionId,
    regionName: row.region?.regionName ?? undefined,
    countryId: row.countryId,
    countryName: row.country?.countryName ?? undefined,
    cityId: row.cityId,
    cityName: row.city?.cityName ?? undefined,
    marketGroupId: row.marketGroupId != null ? Number(row.marketGroupId) : null,
    marketGroupName: row.marketGroup?.marketGroupName ?? undefined,
    ruleTypeId: Number(row.ruleTypeId),
    ruleTypeName: row.ruleType?.ruleTypeName ?? undefined,
    ruleTypeCode: row.ruleType?.ruleTypeCode ?? undefined,
    fromDate: toDateOnly(row.fromDate),
    toDate: toDateOnly(row.toDate),
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
