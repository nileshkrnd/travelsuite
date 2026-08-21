import {
  toAppServiceProductRequirement,
  type ServiceProductRequirementRow,
} from "@/lib/mappers/service-product-requirement.mapper";
import type { ServiceProductRequirement } from "@/types";

export class ServiceProductRequirementsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductRequirementsApiError";
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

export async function listServiceProductRequirements(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductRequirement[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-requirements${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductRequirementsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductRequirementRow[]).map(toAppServiceProductRequirement);
}

export interface ServiceProductRequirementWriteInput {
  serviceProductId: number;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  requirementTypeId: number;
  requirementName: string;
  description?: string | null;
  isMandatory?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createServiceProductRequirement(
  input: ServiceProductRequirementWriteInput & { createdBy: number }
): Promise<ServiceProductRequirement> {
  const res = await fetch("/api/service-product-requirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductRequirementsApiError(await parseError(res), res.status);
  return toAppServiceProductRequirement(await res.json());
}

export async function updateServiceProductRequirement(
  serviceProductRequirementId: number,
  input: Omit<ServiceProductRequirementWriteInput, "serviceProductId"> & { modifiedBy: number }
): Promise<ServiceProductRequirement> {
  const res = await fetch(`/api/service-product-requirements/${serviceProductRequirementId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductRequirementsApiError(await parseError(res), res.status);
  return toAppServiceProductRequirement(await res.json());
}

export async function deleteServiceProductRequirement(serviceProductRequirementId: number): Promise<void> {
  const res = await fetch(`/api/service-product-requirements/${serviceProductRequirementId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductRequirementsApiError(await parseError(res), res.status);
}
