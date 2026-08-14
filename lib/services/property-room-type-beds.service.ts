import {
  toAppPropertyRoomTypeBed,
  type PropertyRoomTypeBedRow,
} from "@/lib/mappers/property-room-type-bed.mapper";
import type { PropertyRoomTypeBed } from "@/types";

export class PropertyRoomTypeBedsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyRoomTypeBedsApiError";
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

export async function listPropertyRoomTypeBeds(options?: {
  propertyRoomId?: number;
  tenantId?: number;
}): Promise<PropertyRoomTypeBed[]> {
  const params = new URLSearchParams();
  if (options?.propertyRoomId !== undefined) params.set("propertyRoomId", String(options.propertyRoomId));
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  const qs = params.toString();
  const res = await fetch(`/api/property-room-type-beds${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyRoomTypeBedsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyRoomTypeBedRow[]).map(toAppPropertyRoomTypeBed);
}

export async function createPropertyRoomTypeBed(input: {
  propertyRoomId: number;
  bedTypeId: number;
  bedCount?: number;
  isExtraBed?: boolean;
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<PropertyRoomTypeBed> {
  const res = await fetch("/api/property-room-type-beds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomTypeBedsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeBed(await res.json());
}

export async function updatePropertyRoomTypeBed(
  propertyRoomTypeBedId: number,
  input: { bedTypeId: number; bedCount?: number; isExtraBed?: boolean; isActive?: boolean; modifiedBy: number }
): Promise<PropertyRoomTypeBed> {
  const res = await fetch(`/api/property-room-type-beds/${propertyRoomTypeBedId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomTypeBedsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeBed(await res.json());
}

export async function setPropertyRoomTypeBedActive(
  propertyRoomTypeBedId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyRoomTypeBed> {
  const res = await fetch(`/api/property-room-type-beds/${propertyRoomTypeBedId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyRoomTypeBedsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeBed(await res.json());
}

export async function deletePropertyRoomTypeBed(propertyRoomTypeBedId: number): Promise<void> {
  const res = await fetch(`/api/property-room-type-beds/${propertyRoomTypeBedId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyRoomTypeBedsApiError(await parseError(res), res.status);
}
