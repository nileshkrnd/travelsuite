import {
  toAppServiceProductAvailability,
  type ServiceProductAvailabilityRow,
} from "@/lib/mappers/service-product-availability.mapper";
import type { ServiceProductAvailability } from "@/types";

export class ServiceProductAvailabilitiesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductAvailabilitiesApiError";
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

export async function listServiceProductAvailabilities(options?: {
  serviceProductId?: number;
  serviceProductOptionId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductAvailability[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.serviceProductOptionId !== undefined) params.set("serviceProductOptionId", String(options.serviceProductOptionId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-availabilities${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductAvailabilitiesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductAvailabilityRow[]).map(toAppServiceProductAvailability);
}

export interface ServiceProductAvailabilityWriteInput {
  serviceProductId: number;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  bookingFromDate?: string | null;
  bookingToDate?: string | null;
  serviceFromDate?: string | null;
  serviceToDate?: string | null;
  isAvailable?: boolean;
  commonStatusId: number;
  days?: { dayOfWeekId: number; isAvailable: boolean }[];
  isActive?: boolean;
}

export async function createServiceProductAvailability(
  input: ServiceProductAvailabilityWriteInput & { createdBy: number }
): Promise<ServiceProductAvailability> {
  const res = await fetch("/api/service-product-availabilities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductAvailabilitiesApiError(await parseError(res), res.status);
  return toAppServiceProductAvailability(await res.json());
}

export async function updateServiceProductAvailability(
  serviceProductAvailabilityId: number,
  input: ServiceProductAvailabilityWriteInput & { modifiedBy: number }
): Promise<ServiceProductAvailability> {
  const res = await fetch(`/api/service-product-availabilities/${serviceProductAvailabilityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductAvailabilitiesApiError(await parseError(res), res.status);
  return toAppServiceProductAvailability(await res.json());
}

export async function setServiceProductAvailabilityActive(
  serviceProductAvailabilityId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductAvailability> {
  const res = await fetch(`/api/service-product-availabilities/${serviceProductAvailabilityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductAvailabilitiesApiError(await parseError(res), res.status);
  return toAppServiceProductAvailability(await res.json());
}

export async function deleteServiceProductAvailability(serviceProductAvailabilityId: number): Promise<void> {
  const res = await fetch(`/api/service-product-availabilities/${serviceProductAvailabilityId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductAvailabilitiesApiError(await parseError(res), res.status);
}
