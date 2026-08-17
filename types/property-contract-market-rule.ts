export type MarketRuleType = "INCLUDE" | "EXCLUDE";

export interface PropertyContractMarketRule {
  id: string;
  propertyContractMarketRuleKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  marketTypeId: number;
  marketTypeCode?: string;
  marketTypeName?: string;
  regionId: number | null;
  regionCode?: string;
  regionName?: string;
  countryId: number | null;
  countryCode?: string;
  countryName?: string;
  cityId: number | null;
  cityCode?: string;
  cityName?: string;
  marketGroupId: number | null;
  marketGroupCode?: string;
  marketGroupName?: string;
  ruleType: MarketRuleType;
  /** YYYY-MM-DD */
  fromDate: string | null;
  /** YYYY-MM-DD */
  toDate: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface PropertyContractMarketRuleWrite {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  marketTypeId: number;
  regionId?: number | null;
  countryId?: number | null;
  cityId?: number | null;
  marketGroupId?: number | null;
  ruleType: MarketRuleType;
  fromDate?: string | null;
  toDate?: string | null;
  isActive?: boolean;
}
