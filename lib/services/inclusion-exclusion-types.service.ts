import {
  toAppInclusionExclusionType,
  type InclusionExclusionTypeRow,
} from "@/lib/mappers/inclusion-exclusion-type.mapper";
import type { InclusionExclusionType } from "@/types";

export class InclusionExclusionTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "InclusionExclusionTypesApiError";
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

export async function listInclusionExclusionTypes(options?: {
  activeOnly?: boolean;
}): Promise<InclusionExclusionType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/inclusion-exclusion-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new InclusionExclusionTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as InclusionExclusionTypeRow[]).map(toAppInclusionExclusionType);
}

export interface InclusionExclusionTypeWriteInput {
  typeCode: string;
  typeName: string;
  isActive?: boolean;
}

export async function createInclusionExclusionType(
  input: InclusionExclusionTypeWriteInput & { createdBy: number }
): Promise<InclusionExclusionType> {
  const res = await fetch("/api/inclusion-exclusion-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new InclusionExclusionTypesApiError(await parseError(res), res.status);
  return toAppInclusionExclusionType(await res.json());
}

export async function updateInclusionExclusionType(
  inclusionExclusionTypeId: number,
  input: InclusionExclusionTypeWriteInput & { modifiedBy: number }
): Promise<InclusionExclusionType> {
  const res = await fetch(`/api/inclusion-exclusion-types/${inclusionExclusionTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new InclusionExclusionTypesApiError(await parseError(res), res.status);
  return toAppInclusionExclusionType(await res.json());
}

export async function setInclusionExclusionTypeActive(
  inclusionExclusionTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<InclusionExclusionType> {
  const res = await fetch(`/api/inclusion-exclusion-types/${inclusionExclusionTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new InclusionExclusionTypesApiError(await parseError(res), res.status);
  return toAppInclusionExclusionType(await res.json());
}

export async function deleteInclusionExclusionType(inclusionExclusionTypeId: number): Promise<void> {
  const res = await fetch(`/api/inclusion-exclusion-types/${inclusionExclusionTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new InclusionExclusionTypesApiError(await parseError(res), res.status);
}
