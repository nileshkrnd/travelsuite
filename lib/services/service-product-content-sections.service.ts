import {
  toAppServiceProductContentSection,
  type ServiceProductContentSectionRow,
} from "@/lib/mappers/service-product-content-section.mapper";
import type { ServiceProductContentSection } from "@/types";

export class ServiceProductContentSectionsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductContentSectionsApiError";
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

export async function listServiceProductContentSections(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductContentSection[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-content-sections${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductContentSectionsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductContentSectionRow[]).map(toAppServiceProductContentSection);
}

export interface ServiceProductContentSectionItemPointInput {
  pointText: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ServiceProductContentSectionItemInput {
  itemTitle: string;
  itemDescription?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  points?: ServiceProductContentSectionItemPointInput[];
}

export interface ServiceProductContentSectionWriteInput {
  serviceProductId: number;
  contentSectionTypeId: number;
  sectionTitle: string;
  sectionDescription?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  items?: ServiceProductContentSectionItemInput[];
}

export async function createServiceProductContentSection(
  input: ServiceProductContentSectionWriteInput & { createdBy: number }
): Promise<ServiceProductContentSection> {
  const res = await fetch("/api/service-product-content-sections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductContentSectionsApiError(await parseError(res), res.status);
  return toAppServiceProductContentSection(await res.json());
}

export async function updateServiceProductContentSection(
  serviceProductContentSectionId: number,
  input: Omit<ServiceProductContentSectionWriteInput, "serviceProductId"> & { modifiedBy: number }
): Promise<ServiceProductContentSection> {
  const res = await fetch(`/api/service-product-content-sections/${serviceProductContentSectionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductContentSectionsApiError(await parseError(res), res.status);
  return toAppServiceProductContentSection(await res.json());
}

export async function deleteServiceProductContentSection(serviceProductContentSectionId: number): Promise<void> {
  const res = await fetch(`/api/service-product-content-sections/${serviceProductContentSectionId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductContentSectionsApiError(await parseError(res), res.status);
}
