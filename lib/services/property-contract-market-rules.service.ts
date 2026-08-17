import type { MarketType } from "@/types/market-type";
import type { MarketGroup } from "@/types/market-group";
import type {
  PropertyContractMarketRule,
  PropertyContractMarketRuleWrite,
} from "@/types/property-contract-market-rule";
import { DEFAULT_MARKET_TYPES } from "@/lib/constants/market-types";
import {
  toAppMarketType,
  toAppMarketGroup,
  toAppPropertyContractMarketRule,
  type MarketTypeRow,
  type MarketGroupRow,
  type PropertyContractMarketRuleRow,
} from "@/lib/mappers/property-contract-market-rule.mapper";

export class MarketTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "MarketTypesApiError";
  }
}

export class MarketGroupsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "MarketGroupsApiError";
  }
}

export class PropertyContractMarketRuleApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyContractMarketRuleApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function listMarketTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<MarketType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/market-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new MarketTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as MarketTypeRow[]).map(toAppMarketType);
}

export async function createMarketType(input: {
  tenantId: number;
  companyId: number;
  marketTypeCode: string;
  marketTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<MarketType> {
  const res = await fetch("/api/market-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new MarketTypesApiError(await parseError(res), res.status);
  return toAppMarketType(await res.json());
}

export async function ensureDefaultMarketTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<MarketType[]> {
  const existing = await listMarketTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((t) => t.marketTypeCode.toUpperCase()));

  for (const [i, row] of DEFAULT_MARKET_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createMarketType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        marketTypeCode: row.code,
        marketTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof MarketTypesApiError && err.status === 409)) throw err;
    }
  }

  return listMarketTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listMarketGroups(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<MarketGroup[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/market-groups${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new MarketGroupsApiError(await parseError(res), res.status);
  return ((await res.json()) as MarketGroupRow[]).map(toAppMarketGroup);
}

export async function createMarketGroup(input: {
  tenantId: number;
  companyId: number;
  marketGroupCode: string;
  marketGroupName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<MarketGroup> {
  const res = await fetch("/api/market-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new MarketGroupsApiError(await parseError(res), res.status);
  return toAppMarketGroup(await res.json());
}

export async function listPropertyContractMarketRules(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractMarketRule[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-market-rules${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractMarketRuleApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractMarketRuleRow[]).map(toAppPropertyContractMarketRule);
}

export async function getPropertyContractMarketRule(
  propertyContractMarketRuleId: number
): Promise<PropertyContractMarketRule> {
  const res = await fetch(`/api/property-contract-market-rules/${propertyContractMarketRuleId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractMarketRuleApiError(await parseError(res), res.status);
  return toAppPropertyContractMarketRule(await res.json());
}

export async function createPropertyContractMarketRule(
  input: PropertyContractMarketRuleWrite & { createdBy: number }
): Promise<PropertyContractMarketRule> {
  const res = await fetch("/api/property-contract-market-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractMarketRuleApiError(await parseError(res), res.status);
  return toAppPropertyContractMarketRule(await res.json());
}

export async function updatePropertyContractMarketRule(
  propertyContractMarketRuleId: number,
  input: PropertyContractMarketRuleWrite & { modifiedBy: number }
): Promise<PropertyContractMarketRule> {
  const res = await fetch(`/api/property-contract-market-rules/${propertyContractMarketRuleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractMarketRuleApiError(await parseError(res), res.status);
  return toAppPropertyContractMarketRule(await res.json());
}

export async function setPropertyContractMarketRuleActive(
  propertyContractMarketRuleId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractMarketRule> {
  const res = await fetch(`/api/property-contract-market-rules/${propertyContractMarketRuleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractMarketRuleApiError(await parseError(res), res.status);
  return toAppPropertyContractMarketRule(await res.json());
}

export async function deletePropertyContractMarketRule(
  propertyContractMarketRuleId: number
): Promise<void> {
  const res = await fetch(`/api/property-contract-market-rules/${propertyContractMarketRuleId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyContractMarketRuleApiError(await parseError(res), res.status);
}
