import type { OwnershipType } from "@/types";
import { toAppOwnershipType, type PropertyLookupRow } from "@/lib/mappers/property.mapper";

export class OwnershipTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "OwnershipTypesApiError";
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

export async function listOwnershipTypes(options?: { activeOnly?: boolean }): Promise<OwnershipType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/ownership-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new OwnershipTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyLookupRow[]).map(toAppOwnershipType);
}

export async function createOwnershipType(input: {
  ownershipTypeName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<OwnershipType> {
  const res = await fetch("/api/ownership-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new OwnershipTypesApiError(await parseError(res), res.status);
  return toAppOwnershipType(await res.json());
}

export async function updateOwnershipType(
  ownershipTypeId: number,
  input: { ownershipTypeName: string; isActive?: boolean; modifiedBy: number }
): Promise<OwnershipType> {
  const res = await fetch(`/api/ownership-types/${ownershipTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new OwnershipTypesApiError(await parseError(res), res.status);
  return toAppOwnershipType(await res.json());
}

export async function setOwnershipTypeActive(
  ownershipTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<OwnershipType> {
  const res = await fetch(`/api/ownership-types/${ownershipTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new OwnershipTypesApiError(await parseError(res), res.status);
  return toAppOwnershipType(await res.json());
}

export async function deleteOwnershipType(ownershipTypeId: number): Promise<void> {
  const res = await fetch(`/api/ownership-types/${ownershipTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new OwnershipTypesApiError(await parseError(res), res.status);
}
