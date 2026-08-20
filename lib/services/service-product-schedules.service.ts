import { toAppServiceProductSchedule, type ServiceProductScheduleRow } from "@/lib/mappers/service-product-schedule.mapper";
import type { ServiceProductSchedule } from "@/types";

export class ServiceProductSchedulesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductSchedulesApiError";
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

export async function listServiceProductSchedules(options?: {
  serviceProductId?: number;
  serviceProductAvailabilityId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductSchedule[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.serviceProductAvailabilityId !== undefined) params.set("serviceProductAvailabilityId", String(options.serviceProductAvailabilityId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-schedules${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductSchedulesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductScheduleRow[]).map(toAppServiceProductSchedule);
}

export interface ServiceProductScheduleWriteInput {
  serviceProductAvailabilityId: number;
  serviceProductId: number;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  dayOfWeekId?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  capacity?: number | null;
  isAvailable?: boolean;
  commonStatusId: number;
  isActive?: boolean;
}

export async function createServiceProductSchedule(
  input: ServiceProductScheduleWriteInput & { createdBy: number }
): Promise<ServiceProductSchedule> {
  const res = await fetch("/api/service-product-schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductSchedulesApiError(await parseError(res), res.status);
  return toAppServiceProductSchedule(await res.json());
}

export async function updateServiceProductSchedule(
  serviceProductScheduleId: number,
  input: ServiceProductScheduleWriteInput & { modifiedBy: number }
): Promise<ServiceProductSchedule> {
  const res = await fetch(`/api/service-product-schedules/${serviceProductScheduleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductSchedulesApiError(await parseError(res), res.status);
  return toAppServiceProductSchedule(await res.json());
}

export async function setServiceProductScheduleActive(
  serviceProductScheduleId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductSchedule> {
  const res = await fetch(`/api/service-product-schedules/${serviceProductScheduleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductSchedulesApiError(await parseError(res), res.status);
  return toAppServiceProductSchedule(await res.json());
}

export async function deleteServiceProductSchedule(serviceProductScheduleId: number): Promise<void> {
  const res = await fetch(`/api/service-product-schedules/${serviceProductScheduleId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductSchedulesApiError(await parseError(res), res.status);
}
