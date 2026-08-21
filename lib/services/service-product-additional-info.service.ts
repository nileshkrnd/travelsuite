import {
  toAppServiceProductAdditionalInfo,
  type ServiceProductAdditionalInfoRow,
} from "@/lib/mappers/service-product-additional-info.mapper";
import type { ServiceProductAdditionalInfo } from "@/types";

export class ServiceProductAdditionalInfoApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductAdditionalInfoApiError";
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

export async function listServiceProductAdditionalInfo(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductAdditionalInfo[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-additional-info${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductAdditionalInfoApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductAdditionalInfoRow[]).map(toAppServiceProductAdditionalInfo);
}

export interface ServiceProductAdditionalInfoWriteInput {
  tenantId: number;
  companyId: number;
  serviceProductId: number;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  additionalInfoTypeId: number;
  valueBoolean?: boolean | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueDate?: string | null;
  valueTime?: string | null;
  valueDateTime?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createServiceProductAdditionalInfo(
  input: ServiceProductAdditionalInfoWriteInput & { createdBy: number }
): Promise<ServiceProductAdditionalInfo> {
  const res = await fetch("/api/service-product-additional-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductAdditionalInfoApiError(await parseError(res), res.status);
  return toAppServiceProductAdditionalInfo(await res.json());
}

export async function updateServiceProductAdditionalInfo(
  serviceProductAdditionalInfoId: number,
  input: Omit<ServiceProductAdditionalInfoWriteInput, "tenantId" | "companyId" | "serviceProductId"> & { modifiedBy: number }
): Promise<ServiceProductAdditionalInfo> {
  const res = await fetch(`/api/service-product-additional-info/${serviceProductAdditionalInfoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductAdditionalInfoApiError(await parseError(res), res.status);
  return toAppServiceProductAdditionalInfo(await res.json());
}

export async function deleteServiceProductAdditionalInfo(serviceProductAdditionalInfoId: number): Promise<void> {
  const res = await fetch(`/api/service-product-additional-info/${serviceProductAdditionalInfoId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductAdditionalInfoApiError(await parseError(res), res.status);
}
