import type { SmokingType } from "@/types";
import { toAppSmokingType, type SmokingTypeRow } from "@/lib/mappers/smoking-type.mapper";

export class SmokingTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SmokingTypesApiError";
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

export async function listSmokingTypes(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<SmokingType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/smoking-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new SmokingTypesApiError(await parseError(res), res.status);
  const data = (await res.json()) as SmokingTypeRow[];
  return data.map(toAppSmokingType);
}

export interface SmokingTypeWriteInput {
  smokingTypeCode: string;
  smokingTypeName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createSmokingType(
  input: SmokingTypeWriteInput & { createdBy: number }
): Promise<SmokingType> {
  const res = await fetch("/api/smoking-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SmokingTypesApiError(await parseError(res), res.status);
  return toAppSmokingType(await res.json());
}

export async function updateSmokingType(
  smokingTypeId: number,
  input: SmokingTypeWriteInput & { modifiedBy: number }
): Promise<SmokingType> {
  const res = await fetch(`/api/smoking-types/${smokingTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SmokingTypesApiError(await parseError(res), res.status);
  return toAppSmokingType(await res.json());
}

export async function setSmokingTypeActive(
  smokingTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<SmokingType> {
  const res = await fetch(`/api/smoking-types/${smokingTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new SmokingTypesApiError(await parseError(res), res.status);
  return toAppSmokingType(await res.json());
}

export async function deleteSmokingType(smokingTypeId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/smoking-types/${smokingTypeId}?modifiedBy=${modifiedBy}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new SmokingTypesApiError(await parseError(res), res.status);
}
