import {
  toAppPropertyTenantDocument,
  type PropertyTenantDocumentRow,
} from "@/lib/mappers/property-tenant-document.mapper";
import type { PropertyTenantDocument } from "@/types";

export class PropertyTenantDocumentsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyTenantDocumentsApiError";
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

export async function listPropertyTenantDocuments(options?: {
  propertyTenantId?: number;
  activeOnly?: boolean;
}): Promise<PropertyTenantDocument[]> {
  const params = new URLSearchParams();
  if (options?.propertyTenantId !== undefined) params.set("propertyTenantId", String(options.propertyTenantId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-tenant-documents${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyTenantDocumentsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyTenantDocumentRow[]).map(toAppPropertyTenantDocument);
}

export interface PropertyTenantDocumentWriteInput {
  propertyTenantId: number;
  identityDocumentCountryId: number;
  documentNumber: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  documentFileUrl?: string | null;
  isPrimary?: boolean;
  isVerified?: boolean;
  verifiedBy?: number | null;
  statusId: number;
  isActive?: boolean;
}

export async function createPropertyTenantDocument(
  input: PropertyTenantDocumentWriteInput & { createdBy: number }
): Promise<PropertyTenantDocument> {
  const res = await fetch("/api/property-tenant-documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyTenantDocumentsApiError(await parseError(res), res.status);
  return toAppPropertyTenantDocument(await res.json());
}

export async function updatePropertyTenantDocument(
  propertyTenantDocumentId: number,
  input: Omit<PropertyTenantDocumentWriteInput, "propertyTenantId"> & { modifiedBy: number }
): Promise<PropertyTenantDocument> {
  const res = await fetch(`/api/property-tenant-documents/${propertyTenantDocumentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyTenantDocumentsApiError(await parseError(res), res.status);
  return toAppPropertyTenantDocument(await res.json());
}

export async function deletePropertyTenantDocument(propertyTenantDocumentId: number): Promise<void> {
  const res = await fetch(`/api/property-tenant-documents/${propertyTenantDocumentId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyTenantDocumentsApiError(await parseError(res), res.status);
}
