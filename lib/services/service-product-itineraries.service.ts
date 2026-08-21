import {
  toAppServiceProductItinerary,
  type ServiceProductItineraryRow,
} from "@/lib/mappers/service-product-itinerary.mapper";
import type { ServiceProductItinerary } from "@/types";

export class ServiceProductItinerariesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductItinerariesApiError";
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

export async function listServiceProductItineraries(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductItinerary[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-itineraries${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductItinerariesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductItineraryRow[]).map(toAppServiceProductItinerary);
}

export interface ServiceProductItineraryWriteInput {
  serviceProductId: number;
  parentServiceProductItineraryId?: number | null;
  dayNumber?: number | null;
  sequenceNumber: number;
  title: string;
  description?: string | null;
  durationValue?: number | null;
  durationUnitId?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  serviceProductLocationId?: number | null;
  isOvernight?: boolean;
  isOptional?: boolean;
  isHighlight?: boolean;
  displayOrder?: number;
  commonStatusId: number;
  isActive?: boolean;
}

export async function createServiceProductItinerary(
  input: ServiceProductItineraryWriteInput & { createdBy: number }
): Promise<ServiceProductItinerary> {
  const res = await fetch("/api/service-product-itineraries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductItinerariesApiError(await parseError(res), res.status);
  return toAppServiceProductItinerary(await res.json());
}

export async function updateServiceProductItinerary(
  serviceProductItineraryId: number,
  input: ServiceProductItineraryWriteInput & { modifiedBy: number }
): Promise<ServiceProductItinerary> {
  const res = await fetch(`/api/service-product-itineraries/${serviceProductItineraryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductItinerariesApiError(await parseError(res), res.status);
  return toAppServiceProductItinerary(await res.json());
}

export async function setServiceProductItineraryActive(
  serviceProductItineraryId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductItinerary> {
  const res = await fetch(`/api/service-product-itineraries/${serviceProductItineraryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductItinerariesApiError(await parseError(res), res.status);
  return toAppServiceProductItinerary(await res.json());
}

export async function deleteServiceProductItinerary(serviceProductItineraryId: number): Promise<void> {
  const res = await fetch(`/api/service-product-itineraries/${serviceProductItineraryId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductItinerariesApiError(await parseError(res), res.status);
}
