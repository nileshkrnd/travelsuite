import {
  toAppServiceProductMarketRule,
  type ServiceProductMarketRuleRow,
} from "@/lib/mappers/service-product-market-rule.mapper";
import type { ServiceProductMarketRule } from "@/types";

export class ServiceProductMarketRulesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductMarketRulesApiError";
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

export async function listServiceProductMarketRules(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductMarketRule[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-market-rules${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductMarketRulesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductMarketRuleRow[]).map(toAppServiceProductMarketRule);
}

export interface ServiceProductMarketRuleWriteInput {
  serviceProductId: number;
  serviceProductSupplierId?: number | null;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  marketTypeId: number;
  regionId?: number | null;
  countryId?: number | null;
  cityId?: number | null;
  marketGroupId?: number | null;
  ruleTypeId: number;
  fromDate?: string | null;
  toDate?: string | null;
  isActive?: boolean;
}

export async function createServiceProductMarketRule(
  input: ServiceProductMarketRuleWriteInput & { createdBy: number }
): Promise<ServiceProductMarketRule> {
  const res = await fetch("/api/service-product-market-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductMarketRulesApiError(await parseError(res), res.status);
  return toAppServiceProductMarketRule(await res.json());
}

export async function updateServiceProductMarketRule(
  serviceProductMarketRuleId: number,
  input: ServiceProductMarketRuleWriteInput & { modifiedBy: number }
): Promise<ServiceProductMarketRule> {
  const res = await fetch(`/api/service-product-market-rules/${serviceProductMarketRuleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductMarketRulesApiError(await parseError(res), res.status);
  return toAppServiceProductMarketRule(await res.json());
}

export async function setServiceProductMarketRuleActive(
  serviceProductMarketRuleId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductMarketRule> {
  const res = await fetch(`/api/service-product-market-rules/${serviceProductMarketRuleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductMarketRulesApiError(await parseError(res), res.status);
  return toAppServiceProductMarketRule(await res.json());
}

export async function deleteServiceProductMarketRule(serviceProductMarketRuleId: number): Promise<void> {
  const res = await fetch(`/api/service-product-market-rules/${serviceProductMarketRuleId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductMarketRulesApiError(await parseError(res), res.status);
}
