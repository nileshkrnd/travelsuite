import {
  toAppPropertyRoomTypeView,
  type PropertyRoomTypeViewRow,
} from "@/lib/mappers/property-room-type-view.mapper";
import type { PropertyRoomTypeView } from "@/types";

export class PropertyRoomTypeViewsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyRoomTypeViewsApiError";
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

export async function listPropertyRoomTypeViews(options?: {
  propertyRoomId?: number;
  tenantId?: number;
}): Promise<PropertyRoomTypeView[]> {
  const params = new URLSearchParams();
  if (options?.propertyRoomId !== undefined) params.set("propertyRoomId", String(options.propertyRoomId));
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  const qs = params.toString();
  const res = await fetch(`/api/property-room-type-views${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyRoomTypeViewsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyRoomTypeViewRow[]).map(toAppPropertyRoomTypeView);
}

export async function createPropertyRoomTypeView(input: {
  propertyRoomId: number;
  viewTypeId: number;
  isPrimary?: boolean;
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<PropertyRoomTypeView> {
  const res = await fetch("/api/property-room-type-views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomTypeViewsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeView(await res.json());
}

export async function updatePropertyRoomTypeView(
  propertyRoomTypeViewId: number,
  input: { viewTypeId: number; isPrimary?: boolean; isActive?: boolean; modifiedBy: number }
): Promise<PropertyRoomTypeView> {
  const res = await fetch(`/api/property-room-type-views/${propertyRoomTypeViewId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyRoomTypeViewsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeView(await res.json());
}

export async function setPropertyRoomTypeViewActive(
  propertyRoomTypeViewId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyRoomTypeView> {
  const res = await fetch(`/api/property-room-type-views/${propertyRoomTypeViewId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyRoomTypeViewsApiError(await parseError(res), res.status);
  return toAppPropertyRoomTypeView(await res.json());
}

export async function deletePropertyRoomTypeView(propertyRoomTypeViewId: number): Promise<void> {
  const res = await fetch(`/api/property-room-type-views/${propertyRoomTypeViewId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyRoomTypeViewsApiError(await parseError(res), res.status);
}
