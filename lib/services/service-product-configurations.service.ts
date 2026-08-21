import {
  toAppServiceProductConfiguration,
  type ServiceProductConfigurationRow,
} from "@/lib/mappers/service-product-configuration.mapper";
import type { ServiceProductConfiguration } from "@/types";

export class ServiceProductConfigurationsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductConfigurationsApiError";
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

export async function getServiceProductConfiguration(serviceProductId: number): Promise<ServiceProductConfiguration | null> {
  const res = await fetch(`/api/service-product-configurations?serviceProductId=${serviceProductId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new ServiceProductConfigurationsApiError(await parseError(res), res.status);
  const row = (await res.json()) as ServiceProductConfigurationRow | null;
  return row ? toAppServiceProductConfiguration(row) : null;
}

export interface ServiceProductConfigurationFlags {
  durationValue?: string | null;
  durationUnitId?: number | null;
  bookingModelId?: number | null;
  pricingModelId?: number | null;
  minimumPax?: number | null;
  maximumPax?: number | null;
  minimumAge?: number | null;
  maximumAge?: number | null;
  isInstantConfirmation?: boolean;
  isRequestOnly?: boolean;
  isDateRequired?: boolean;
  isTimeRequired?: boolean;
  isPickupRequired?: boolean;
  isDropoffRequired?: boolean;
  isScheduleRequired?: boolean;
  isAvailabilityRequired?: boolean;
  isItineraryRequired?: boolean;
  isCancellationPolicyRequired?: boolean;
}

export async function saveServiceProductConfiguration(
  input: ServiceProductConfigurationFlags & { serviceProductId: number; actorId: number }
): Promise<ServiceProductConfiguration> {
  const res = await fetch("/api/service-product-configurations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductConfigurationsApiError(await parseError(res), res.status);
  return toAppServiceProductConfiguration(await res.json());
}
