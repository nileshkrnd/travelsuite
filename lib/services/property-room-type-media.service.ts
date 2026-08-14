import {
  toAppPropertyRoomTypeMedia,
  type PropertyRoomTypeMediaRow,
} from "@/lib/mappers/property-room-type-media.mapper";
import type { PropertyRoomTypeMedia } from "@/types";

export class PropertyRoomTypeMediaApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyRoomTypeMediaApiError";
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

export interface PropertyRoomTypeMediaWriteInput {
  mediaTypeId: number;
  mediaCategoryId: number;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  altText?: string | null;
  caption?: string | null;
  displayOrder?: number;
  isPrimary?: boolean;
}

export async function listPropertyRoomTypeMedia(options?: {
  propertyRoomId?: number;
  tenantId?: number;
}): Promise<PropertyRoomTypeMedia[]> {
  const params = new URLSearchParams();
  if (options?.propertyRoomId !== undefined) params.set("propertyRoomId", String(options.propertyRoomId));
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  const qs = params.toString();
  const res = await fetch(`/api/property-room-type-media${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyRoomTypeMediaApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyRoomTypeMediaRow[]).map(toAppPropertyRoomTypeMedia);
}

export async function createPropertyRoomTypeMedia(
  input: PropertyRoomTypeMediaWriteInput & {
    propertyId: number;
    propertyRoomId: number;
    tenantId: number;
    companyId: number;
    createdBy: number;
  }
): Promise<PropertyRoomTypeMedia> {
  const res = await fetch("/api/property-room-type-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomTypeMediaApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeMedia(await res.json());
}

export async function updatePropertyRoomTypeMedia(
  propertyRoomTypeMediaId: number,
  input: PropertyRoomTypeMediaWriteInput & { isActive?: boolean; modifiedBy: number }
): Promise<PropertyRoomTypeMedia> {
  const res = await fetch(`/api/property-room-type-media/${propertyRoomTypeMediaId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomTypeMediaApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeMedia(await res.json());
}

export async function setPropertyRoomTypeMediaActive(
  propertyRoomTypeMediaId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyRoomTypeMedia> {
  const res = await fetch(`/api/property-room-type-media/${propertyRoomTypeMediaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyRoomTypeMediaApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeMedia(await res.json());
}

export async function deletePropertyRoomTypeMedia(propertyRoomTypeMediaId: number): Promise<void> {
  const res = await fetch(`/api/property-room-type-media/${propertyRoomTypeMediaId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyRoomTypeMediaApiError(await parseError(res), res.status);
}
