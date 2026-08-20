import {
  toAppServiceProductClassificationConfiguration,
  type ServiceProductClassificationConfigurationRow,
} from "@/lib/mappers/service-product-classification-configuration.mapper";
import type { ServiceProductClassificationConfiguration } from "@/types";

export class ServiceProductClassificationConfigurationsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductClassificationConfigurationsApiError";
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

export async function listServiceProductClassificationConfigurations(options?: {
  tenantId?: number;
  companyId?: number;
  serviceProductClassificationId?: number;
}): Promise<ServiceProductClassificationConfiguration[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.serviceProductClassificationId !== undefined) {
    params.set("serviceProductClassificationId", String(options.serviceProductClassificationId));
  }
  const qs = params.toString();
  const res = await fetch(`/api/service-product-classification-configurations${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new ServiceProductClassificationConfigurationsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductClassificationConfigurationRow[]).map(
    toAppServiceProductClassificationConfiguration
  );
}

export interface ServiceProductClassificationConfigurationFlags {
  isDurationApplicable?: boolean | null;
  isBookingModelApplicable?: boolean | null;
  isPricingModelApplicable?: boolean | null;
  isPaxApplicable?: boolean | null;
  isAgeApplicable?: boolean | null;
  isPickupApplicable?: boolean | null;
  isDropoffApplicable?: boolean | null;
  isScheduleApplicable?: boolean | null;
  isAvailabilityApplicable?: boolean | null;
  isItineraryApplicable?: boolean | null;
  isCancellationApplicable?: boolean | null;
  isOnlineSellable?: boolean | null;
}

export async function saveServiceProductClassificationConfiguration(
  input: ServiceProductClassificationConfigurationFlags & {
    serviceProductClassificationId: number;
    tenantId: number;
    companyId: number;
    actorId: number;
  }
): Promise<ServiceProductClassificationConfiguration> {
  const res = await fetch("/api/service-product-classification-configurations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductClassificationConfigurationsApiError(await parseError(res), res.status);
  return toAppServiceProductClassificationConfiguration(await res.json());
}
