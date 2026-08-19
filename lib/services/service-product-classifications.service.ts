import {
  toAppServiceProductClassification,
  type ServiceProductClassificationRow,
} from "@/lib/mappers/service-product-classification.mapper";
import type { ServiceProductClassification } from "@/types";

export class ServiceProductClassificationsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductClassificationsApiError";
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

export async function listServiceProductClassifications(options?: {
  tenantId?: number;
  companyId?: number;
  serviceTypeId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductClassification[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.serviceTypeId !== undefined) params.set("serviceTypeId", String(options.serviceTypeId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-classifications${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductClassificationsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductClassificationRow[]).map(toAppServiceProductClassification);
}

export interface ServiceProductClassificationWriteInput {
  serviceTypeId: number;
  classificationCode: string;
  classificationName: string;
  parentClassificationId?: number | null;
  description?: string;
  icon?: string;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
}

export async function createServiceProductClassification(
  input: ServiceProductClassificationWriteInput & { createdBy: number }
): Promise<ServiceProductClassification> {
  const res = await fetch("/api/service-product-classifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductClassificationsApiError(await parseError(res), res.status);
  return toAppServiceProductClassification(await res.json());
}

export async function updateServiceProductClassification(
  serviceProductClassificationId: number,
  input: ServiceProductClassificationWriteInput & { modifiedBy: number }
): Promise<ServiceProductClassification> {
  const res = await fetch(`/api/service-product-classifications/${serviceProductClassificationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductClassificationsApiError(await parseError(res), res.status);
  return toAppServiceProductClassification(await res.json());
}

export async function setServiceProductClassificationActive(
  serviceProductClassificationId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductClassification> {
  const res = await fetch(`/api/service-product-classifications/${serviceProductClassificationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductClassificationsApiError(await parseError(res), res.status);
  return toAppServiceProductClassification(await res.json());
}

export async function deleteServiceProductClassification(
  serviceProductClassificationId: number
): Promise<void> {
  const res = await fetch(`/api/service-product-classifications/${serviceProductClassificationId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new ServiceProductClassificationsApiError(await parseError(res), res.status);
}
