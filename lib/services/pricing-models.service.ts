import { toAppPricingModel, type PricingModelRow } from "@/lib/mappers/pricing-model.mapper";
import type { PricingModel } from "@/types";

export class PricingModelsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PricingModelsApiError";
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

export async function listPricingModels(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<PricingModel[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/pricing-models${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PricingModelsApiError(await parseError(res), res.status);
  return ((await res.json()) as PricingModelRow[]).map(toAppPricingModel);
}

export async function createPricingModel(input: {
  pricingModelCode: string;
  pricingModelName: string;
  description?: string;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<PricingModel> {
  const res = await fetch("/api/pricing-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PricingModelsApiError(await parseError(res), res.status);
  return toAppPricingModel(await res.json());
}

export async function updatePricingModel(
  pricingModelId: number,
  input: {
    pricingModelCode: string;
    pricingModelName: string;
    description?: string;
    displayOrder?: number;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<PricingModel> {
  const res = await fetch(`/api/pricing-models/${pricingModelId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PricingModelsApiError(await parseError(res), res.status);
  return toAppPricingModel(await res.json());
}

export async function setPricingModelActive(
  pricingModelId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PricingModel> {
  const res = await fetch(`/api/pricing-models/${pricingModelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PricingModelsApiError(await parseError(res), res.status);
  return toAppPricingModel(await res.json());
}

export async function deletePricingModel(pricingModelId: number): Promise<void> {
  const res = await fetch(`/api/pricing-models/${pricingModelId}`, { method: "DELETE" });
  if (!res.ok) throw new PricingModelsApiError(await parseError(res), res.status);
}
