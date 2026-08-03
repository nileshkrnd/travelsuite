import type { StateAdministrativeType } from "@/types";
import {
  toAppStateAdministrativeType,
  type StateAdministrativeTypeRow,
} from "@/lib/mappers/geo.mapper";

export class StateAdministrativeTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "StateAdministrativeTypesApiError";
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

export async function listStateAdministrativeTypes(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<StateAdministrativeType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/state-administrative-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new StateAdministrativeTypesApiError(await parseError(res), res.status);
  const data = (await res.json()) as StateAdministrativeTypeRow[];
  return data.map(toAppStateAdministrativeType);
}

export async function createStateAdministrativeType(input: {
  administrativeType: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<StateAdministrativeType> {
  const res = await fetch("/api/state-administrative-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new StateAdministrativeTypesApiError(await parseError(res), res.status);
  return toAppStateAdministrativeType(await res.json());
}

export async function updateStateAdministrativeType(
  stateAdministrativeTypeId: number,
  input: { administrativeType: string; isActive?: boolean; modifiedBy: number }
): Promise<StateAdministrativeType> {
  const res = await fetch(`/api/state-administrative-types/${stateAdministrativeTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new StateAdministrativeTypesApiError(await parseError(res), res.status);
  return toAppStateAdministrativeType(await res.json());
}

export async function setStateAdministrativeTypeActive(
  stateAdministrativeTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<StateAdministrativeType> {
  const res = await fetch(`/api/state-administrative-types/${stateAdministrativeTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new StateAdministrativeTypesApiError(await parseError(res), res.status);
  return toAppStateAdministrativeType(await res.json());
}

export async function deleteStateAdministrativeType(
  stateAdministrativeTypeId: number,
  modifiedBy: number
): Promise<void> {
  const res = await fetch(`/api/state-administrative-types/${stateAdministrativeTypeId}?modifiedBy=${modifiedBy}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new StateAdministrativeTypesApiError(await parseError(res), res.status);
}
