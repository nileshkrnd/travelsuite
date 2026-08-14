import {
  toAppPropertyRoomTypeExtraBed,
  type PropertyRoomTypeExtraBedRow,
} from "@/lib/mappers/property-room-type-extra-bed.mapper";
import type { PropertyRoomTypeExtraBed } from "@/types";

export class PropertyRoomTypeExtraBedsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyRoomTypeExtraBedsApiError";
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

export async function listPropertyRoomTypeExtraBeds(options?: {
  propertyRoomId?: number;
  tenantId?: number;
}): Promise<PropertyRoomTypeExtraBed[]> {
  const params = new URLSearchParams();
  if (options?.propertyRoomId !== undefined) params.set("propertyRoomId", String(options.propertyRoomId));
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  const qs = params.toString();
  const res = await fetch(`/api/property-room-type-extra-beds${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyRoomTypeExtraBedsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyRoomTypeExtraBedRow[]).map(toAppPropertyRoomTypeExtraBed);
}

export async function createPropertyRoomTypeExtraBed(input: {
  propertyRoomId: number;
  extraBedTypeId: number;
  maxQuantity?: number;
  adultAllowed?: boolean;
  childAllowed?: boolean;
  isComplimentary?: boolean;
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<PropertyRoomTypeExtraBed> {
  const res = await fetch("/api/property-room-type-extra-beds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomTypeExtraBedsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeExtraBed(await res.json());
}

export async function updatePropertyRoomTypeExtraBed(
  propertyRoomTypeExtraBedId: number,
  input: {
    extraBedTypeId: number;
    maxQuantity?: number;
    adultAllowed?: boolean;
    childAllowed?: boolean;
    isComplimentary?: boolean;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<PropertyRoomTypeExtraBed> {
  const res = await fetch(`/api/property-room-type-extra-beds/${propertyRoomTypeExtraBedId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomTypeExtraBedsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeExtraBed(await res.json());
}

export async function setPropertyRoomTypeExtraBedActive(
  propertyRoomTypeExtraBedId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyRoomTypeExtraBed> {
  const res = await fetch(`/api/property-room-type-extra-beds/${propertyRoomTypeExtraBedId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyRoomTypeExtraBedsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeExtraBed(await res.json());
}

export async function deletePropertyRoomTypeExtraBed(propertyRoomTypeExtraBedId: number): Promise<void> {
  const res = await fetch(`/api/property-room-type-extra-beds/${propertyRoomTypeExtraBedId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyRoomTypeExtraBedsApiError(await parseError(res), res.status);
}
