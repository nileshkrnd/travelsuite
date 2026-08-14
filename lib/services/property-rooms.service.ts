import type { PropertyRoom } from "@/types";
import { toAppPropertyRoom, type PropertyRoomRow } from "@/lib/mappers/property-room.mapper";

export class PropertyRoomsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyRoomsApiError";
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

export interface PropertyRoomWriteInput {
  tenantId: number;
  companyId: number;
  propertyId: number;
  roomTypeId: number;
  roomCode: string;
  roomName: string;
  description?: string | null;
  maxAdult: number;
  maxChild: number;
  maxOccupancy: number;
  roomSize?: number | null;
  roomSizeUnitId?: number | null;
  smokingTypeId?: number | null;
  viewTypeId?: number | null;
  extraBedAllowed?: boolean;
  maxExtraBed?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export async function listPropertyRooms(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  roomTypeId?: number;
  activeOnly?: boolean;
}): Promise<PropertyRoom[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.roomTypeId !== undefined) params.set("roomTypeId", String(options.roomTypeId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-rooms${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyRoomsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyRoomRow[]).map(toAppPropertyRoom);
}

export async function getPropertyRoom(propertyRoomId: number): Promise<PropertyRoom> {
  const res = await fetch(`/api/property-rooms/${propertyRoomId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyRoomsApiError(await parseError(res), res.status);
  return toAppPropertyRoom(await res.json());
}

export async function createPropertyRoom(
  input: PropertyRoomWriteInput & { createdBy: number }
): Promise<PropertyRoom> {
  const res = await fetch("/api/property-rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomsApiError(await parseError(res), res.status);
  return toAppPropertyRoom(await res.json());
}

export async function updatePropertyRoom(
  propertyRoomId: number,
  input: PropertyRoomWriteInput & { modifiedBy: number }
): Promise<PropertyRoom> {
  const res = await fetch(`/api/property-rooms/${propertyRoomId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomsApiError(await parseError(res), res.status);
  return toAppPropertyRoom(await res.json());
}

export async function setPropertyRoomActive(
  propertyRoomId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyRoom> {
  const res = await fetch(`/api/property-rooms/${propertyRoomId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyRoomsApiError(await parseError(res), res.status);
  return toAppPropertyRoom(await res.json());
}

export async function deletePropertyRoom(propertyRoomId: number): Promise<void> {
  const res = await fetch(`/api/property-rooms/${propertyRoomId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyRoomsApiError(await parseError(res), res.status);
}
