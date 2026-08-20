import {
  toAppServiceProductInclusionExclusion,
  type ServiceProductInclusionExclusionRow,
} from "@/lib/mappers/service-product-inclusion-exclusion.mapper";
import type { ServiceProductInclusionExclusion } from "@/types";

export class ServiceProductInclusionExclusionsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductInclusionExclusionsApiError";
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

export async function listServiceProductInclusionExclusions(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductInclusionExclusion[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-inclusion-exclusions${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductInclusionExclusionsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductInclusionExclusionRow[]).map(toAppServiceProductInclusionExclusion);
}

export interface ServiceProductInclusionExclusionWriteInput {
  serviceProductId: number;
  inclusionExclusionTypeId: number;
  itemTypeId?: number | null;
  itemName: string;
  description?: string | null;
  quantity?: number | null;
  unitId?: number | null;
  isMandatory?: boolean;
  displayOrder?: number;
  commonStatusId: number;
  isActive?: boolean;
}

export async function createServiceProductInclusionExclusion(
  input: ServiceProductInclusionExclusionWriteInput & { createdBy: number }
): Promise<ServiceProductInclusionExclusion> {
  const res = await fetch("/api/service-product-inclusion-exclusions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductInclusionExclusionsApiError(await parseError(res), res.status);
  return toAppServiceProductInclusionExclusion(await res.json());
}

export async function updateServiceProductInclusionExclusion(
  serviceProductInclusionExclusionId: number,
  input: ServiceProductInclusionExclusionWriteInput & { modifiedBy: number }
): Promise<ServiceProductInclusionExclusion> {
  const res = await fetch(`/api/service-product-inclusion-exclusions/${serviceProductInclusionExclusionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductInclusionExclusionsApiError(await parseError(res), res.status);
  return toAppServiceProductInclusionExclusion(await res.json());
}

export async function setServiceProductInclusionExclusionActive(
  serviceProductInclusionExclusionId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductInclusionExclusion> {
  const res = await fetch(`/api/service-product-inclusion-exclusions/${serviceProductInclusionExclusionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductInclusionExclusionsApiError(await parseError(res), res.status);
  return toAppServiceProductInclusionExclusion(await res.json());
}

export async function deleteServiceProductInclusionExclusion(serviceProductInclusionExclusionId: number): Promise<void> {
  const res = await fetch(`/api/service-product-inclusion-exclusions/${serviceProductInclusionExclusionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new ServiceProductInclusionExclusionsApiError(await parseError(res), res.status);
}
