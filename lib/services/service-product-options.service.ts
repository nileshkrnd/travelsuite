import { toAppServiceProductOption, type ServiceProductOptionRow } from "@/lib/mappers/service-product-option.mapper";
import type { ServiceProductOption } from "@/types";

export class ServiceProductOptionsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductOptionsApiError";
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

export async function listServiceProductOptions(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductOption[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-options${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductOptionsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductOptionRow[]).map(toAppServiceProductOption);
}

export interface ServiceProductOptionWriteInput {
  serviceProductId: number;
  optionCode: string;
  optionName: string;
  description?: string;
  displayOrder?: number;
  isDefault?: boolean;
  isOnlineSellable?: boolean;
  commonStatusId: number;
  isActive?: boolean;
}

export async function createServiceProductOption(
  input: ServiceProductOptionWriteInput & { createdBy: number }
): Promise<ServiceProductOption> {
  const res = await fetch("/api/service-product-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductOptionsApiError(await parseError(res), res.status);
  return toAppServiceProductOption(await res.json());
}

export async function updateServiceProductOption(
  serviceProductOptionId: number,
  input: ServiceProductOptionWriteInput & { modifiedBy: number }
): Promise<ServiceProductOption> {
  const res = await fetch(`/api/service-product-options/${serviceProductOptionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductOptionsApiError(await parseError(res), res.status);
  return toAppServiceProductOption(await res.json());
}

export async function setServiceProductOptionActive(
  serviceProductOptionId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductOption> {
  const res = await fetch(`/api/service-product-options/${serviceProductOptionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductOptionsApiError(await parseError(res), res.status);
  return toAppServiceProductOption(await res.json());
}

export async function deleteServiceProductOption(serviceProductOptionId: number): Promise<void> {
  const res = await fetch(`/api/service-product-options/${serviceProductOptionId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductOptionsApiError(await parseError(res), res.status);
}
