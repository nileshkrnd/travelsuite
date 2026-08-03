import type { State } from "@/types";
import { toAppState, type StateRow } from "@/lib/mappers/geo.mapper";

export class StatesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "StatesApiError";
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

export async function listStates(options?: {
  countryCode?: string;
  countryId?: number;
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<State[]> {
  const params = new URLSearchParams();
  if (options?.countryCode) params.set("countryCode", options.countryCode);
  if (options?.countryId) params.set("countryId", String(options.countryId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/states${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new StatesApiError(await parseError(res), res.status);
  const data = (await res.json()) as StateRow[];
  return data.map(toAppState);
}

export interface StateWriteInput {
  countryId: number;
  stateCode: string;
  isoCode?: string;
  stateName: string;
  nativeName?: string;
  stateAdministrativeTypeId?: number | null;
  capitalCityId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  displayOrder?: number;
  isActive?: boolean;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createState(input: StateWriteInput): Promise<State> {
  const res = await fetch("/api/states", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new StatesApiError(await parseError(res), res.status);
  return toAppState(await res.json());
}

export async function updateState(stateId: number, input: StateWriteInput): Promise<State> {
  const res = await fetch(`/api/states/${stateId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new StatesApiError(await parseError(res), res.status);
  return toAppState(await res.json());
}

export async function setStateActive(stateId: number, isActive: boolean, modifiedBy: number): Promise<State> {
  const res = await fetch(`/api/states/${stateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new StatesApiError(await parseError(res), res.status);
  return toAppState(await res.json());
}

export async function deleteState(stateId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/states/${stateId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new StatesApiError(await parseError(res), res.status);
}
