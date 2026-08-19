import {
  toAppServiceTypeConfiguration,
  type ServiceTypeConfigurationRow,
} from "@/lib/mappers/service-type-configuration.mapper";
import type { ServiceTypeConfiguration } from "@/types";

export class ServiceTypeConfigurationsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceTypeConfigurationsApiError";
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

export async function listServiceTypeConfigurations(options?: {
  tenantId?: number;
  companyId?: number;
  serviceTypeId?: number;
}): Promise<ServiceTypeConfiguration[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.serviceTypeId !== undefined) params.set("serviceTypeId", String(options.serviceTypeId));
  const qs = params.toString();
  const res = await fetch(`/api/service-type-configurations${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceTypeConfigurationsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceTypeConfigurationRow[]).map(toAppServiceTypeConfiguration);
}

export interface ServiceTypeConfigurationFlags {
  isDurationApplicable?: boolean;
  isBookingModelApplicable?: boolean;
  isPricingModelApplicable?: boolean;
  isPaxApplicable?: boolean;
  isAgeApplicable?: boolean;
  isPickupApplicable?: boolean;
  isDropoffApplicable?: boolean;
  isScheduleApplicable?: boolean;
  isAvailabilityApplicable?: boolean;
  isItineraryApplicable?: boolean;
  isCancellationApplicable?: boolean;
  isOnlineSellable?: boolean;
}

export async function saveServiceTypeConfiguration(
  input: ServiceTypeConfigurationFlags & {
    serviceTypeId: number;
    tenantId: number;
    companyId: number;
    actorId: number;
  }
): Promise<ServiceTypeConfiguration> {
  const res = await fetch("/api/service-type-configurations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceTypeConfigurationsApiError(await parseError(res), res.status);
  return toAppServiceTypeConfiguration(await res.json());
}
