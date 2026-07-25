import { toAppAirlineType } from "@/lib/mappers/aviation.mapper";
import type { AirlineType } from "@/types";

export class AirlineTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AirlineTypesApiError";
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

export async function listAirlineTypes(options?: { activeOnly?: boolean }): Promise<AirlineType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/airline-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AirlineTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as Parameters<typeof toAppAirlineType>[0][]).map(toAppAirlineType);
}

export async function createAirlineType(input: {
  airlineTypeName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<AirlineType> {
  const res = await fetch("/api/airline-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AirlineTypesApiError(await parseError(res), res.status);
  return toAppAirlineType(await res.json());
}

export async function updateAirlineType(
  airlineTypeId: number,
  input: { airlineTypeName: string; isActive?: boolean; modifiedBy: number }
): Promise<AirlineType> {
  const res = await fetch(`/api/airline-types/${airlineTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AirlineTypesApiError(await parseError(res), res.status);
  return toAppAirlineType(await res.json());
}

export async function setAirlineTypeActive(
  airlineTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<AirlineType> {
  const res = await fetch(`/api/airline-types/${airlineTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new AirlineTypesApiError(await parseError(res), res.status);
  return toAppAirlineType(await res.json());
}

export async function deleteAirlineType(airlineTypeId: number): Promise<void> {
  const res = await fetch(`/api/airline-types/${airlineTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new AirlineTypesApiError(await parseError(res), res.status);
}
