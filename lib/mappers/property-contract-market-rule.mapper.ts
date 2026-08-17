import type { MarketType } from "@/types/market-type";
import type { MarketGroup } from "@/types/market-group";
import type {
  MarketRuleType,
  PropertyContractMarketRule,
} from "@/types/property-contract-market-rule";

export type MarketTypeRow = {
  marketTypeId: number;
  tenantId: number;
  companyId: number;
  marketTypeCode: string;
  marketTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type MarketGroupRow = {
  marketGroupId: number;
  tenantId: number;
  companyId: number;
  marketGroupCode: string;
  marketGroupName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type PropertyContractMarketRuleRow = {
  propertyContractMarketRuleId: number;
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  marketTypeId: number;
  regionId: number | null;
  countryId: number | null;
  cityId: number | null;
  marketGroupId: number | null;
  ruleType: string;
  fromDate: string | null;
  toDate: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  contractNumber?: string;
  contractName?: string;
  marketTypeCode?: string;
  marketTypeName?: string;
  regionCode?: string;
  regionName?: string;
  countryCode?: string;
  countryName?: string;
  cityCode?: string;
  cityName?: string;
  marketGroupCode?: string;
  marketGroupName?: string;
};

export function toAppMarketType(row: MarketTypeRow): MarketType {
  return {
    id: String(row.marketTypeId),
    marketTypeKey: row.marketTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    marketTypeCode: row.marketTypeCode,
    marketTypeName: row.marketTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppMarketGroup(row: MarketGroupRow): MarketGroup {
  return {
    id: String(row.marketGroupId),
    marketGroupKey: row.marketGroupId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    marketGroupCode: row.marketGroupCode,
    marketGroupName: row.marketGroupName,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppPropertyContractMarketRule(
  row: PropertyContractMarketRuleRow
): PropertyContractMarketRule {
  return {
    id: String(row.propertyContractMarketRuleId),
    propertyContractMarketRuleKey: row.propertyContractMarketRuleId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: row.propertyContractId,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    marketTypeId: row.marketTypeId,
    marketTypeCode: row.marketTypeCode,
    marketTypeName: row.marketTypeName,
    regionId: row.regionId,
    regionCode: row.regionCode,
    regionName: row.regionName,
    countryId: row.countryId,
    countryCode: row.countryCode,
    countryName: row.countryName,
    cityId: row.cityId,
    cityCode: row.cityCode,
    cityName: row.cityName,
    marketGroupId: row.marketGroupId,
    marketGroupCode: row.marketGroupCode,
    marketGroupName: row.marketGroupName,
    ruleType: row.ruleType as MarketRuleType,
    fromDate: row.fromDate,
    toDate: row.toDate,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
