import { toAppServiceProductMedia, type ServiceProductMediaRow } from "@/lib/mappers/service-product-media.mapper";
import type { ServiceProductMedia } from "@/types";

export class ServiceProductMediaApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductMediaApiError";
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

export async function listServiceProductMedia(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductMedia[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-media${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductMediaApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductMediaRow[]).map(toAppServiceProductMedia);
}

export interface ServiceProductMediaWriteInput {
  serviceProductId: number;
  mediaTypeId: number;
  mediaCategoryId: number;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  mediaTitle?: string | null;
  mediaDescription?: string | null;
  altText?: string | null;
  fileName?: string | null;
  fileExtension?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  isPrimary?: boolean;
  displayOrder?: number;
  commonStatusId: number;
  isActive?: boolean;
}

export async function createServiceProductMedia(
  input: ServiceProductMediaWriteInput & { createdBy: number }
): Promise<ServiceProductMedia> {
  const res = await fetch("/api/service-product-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductMediaApiError(await parseError(res), res.status);
  return toAppServiceProductMedia(await res.json());
}

export async function updateServiceProductMedia(
  serviceProductMediaId: number,
  input: ServiceProductMediaWriteInput & { modifiedBy: number }
): Promise<ServiceProductMedia> {
  const res = await fetch(`/api/service-product-media/${serviceProductMediaId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductMediaApiError(await parseError(res), res.status);
  return toAppServiceProductMedia(await res.json());
}

export async function setServiceProductMediaActive(
  serviceProductMediaId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductMedia> {
  const res = await fetch(`/api/service-product-media/${serviceProductMediaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductMediaApiError(await parseError(res), res.status);
  return toAppServiceProductMedia(await res.json());
}

export async function deleteServiceProductMedia(serviceProductMediaId: number): Promise<void> {
  const res = await fetch(`/api/service-product-media/${serviceProductMediaId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductMediaApiError(await parseError(res), res.status);
}
