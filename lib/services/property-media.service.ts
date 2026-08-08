import type { PropertyMedia, PropertyMediaKind } from "@/types";
import { toAppPropertyMedia, type PropertyMediaRow } from "@/lib/mappers/property-media.mapper";

export class PropertyMediaApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyMediaApiError";
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

export async function listPropertyMedia(
  propertyId: number,
  options?: { activeOnly?: boolean }
): Promise<PropertyMedia[]> {
  const params = new URLSearchParams({ propertyId: String(propertyId) });
  if (options?.activeOnly) params.set("activeOnly", "true");
  const res = await fetch(`/api/property-media?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyMediaApiError(await parseError(res), res.status);
  const data = (await res.json()) as PropertyMediaRow[];
  return data.map(toAppPropertyMedia);
}

export async function uploadPropertyMedia(
  file: File,
  input: {
    propertyId: number;
    mediaType: PropertyMediaKind;
    imageType: string;
    description?: string;
    createdBy: number;
  }
): Promise<PropertyMedia> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("propertyId", String(input.propertyId));
  formData.set("mediaType", input.mediaType);
  formData.set("imageType", input.imageType);
  formData.set("description", input.description ?? "");
  formData.set("createdBy", String(input.createdBy));

  const res = await fetch("/api/property-media", { method: "POST", body: formData });
  if (!res.ok) throw new PropertyMediaApiError(await parseError(res), res.status);
  return toAppPropertyMedia(await res.json());
}

export async function updatePropertyMedia(
  propertyMediaId: number,
  patch: { imageType?: string; description?: string | null; isCover?: boolean; isActive?: boolean; modifiedBy: number }
): Promise<PropertyMedia> {
  const res = await fetch(`/api/property-media/${propertyMediaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new PropertyMediaApiError(await parseError(res), res.status);
  return toAppPropertyMedia(await res.json());
}

export async function setCoverPropertyMedia(propertyMediaId: number, modifiedBy: number): Promise<PropertyMedia> {
  return updatePropertyMedia(propertyMediaId, { isCover: true, modifiedBy });
}

export async function deletePropertyMedia(propertyMediaId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/property-media/${propertyMediaId}?modifiedBy=${modifiedBy}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyMediaApiError(await parseError(res), res.status);
}
