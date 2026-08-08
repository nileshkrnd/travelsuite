import type { BedType } from "@/types";
import { toAppBedType, type BedTypeRow } from "@/lib/mappers/bed-type.mapper";

export class BedTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "BedTypesApiError";
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

export async function listBedTypes(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<BedType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/bed-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new BedTypesApiError(await parseError(res), res.status);
  const data = (await res.json()) as BedTypeRow[];
  return data.map(toAppBedType);
}

export interface BedTypeWriteInput {
  bedTypeCode: string;
  bedTypeName: string;
  bedSize?: string | null;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createBedType(input: BedTypeWriteInput & { createdBy: number }): Promise<BedType> {
  const res = await fetch("/api/bed-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BedTypesApiError(await parseError(res), res.status);
  return toAppBedType(await res.json());
}

export async function updateBedType(
  bedTypeId: number,
  input: BedTypeWriteInput & { modifiedBy: number }
): Promise<BedType> {
  const res = await fetch(`/api/bed-types/${bedTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BedTypesApiError(await parseError(res), res.status);
  return toAppBedType(await res.json());
}

export async function setBedTypeActive(
  bedTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<BedType> {
  const res = await fetch(`/api/bed-types/${bedTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new BedTypesApiError(await parseError(res), res.status);
  return toAppBedType(await res.json());
}

export async function deleteBedType(bedTypeId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/bed-types/${bedTypeId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new BedTypesApiError(await parseError(res), res.status);
}
