import { toAppAirline } from "@/lib/mappers/aviation.mapper";
import type { Airline } from "@/types";

export class AirlinesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AirlinesApiError";
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

export async function listAirlines(options?: {
  activeOnly?: boolean;
  airlineTypeId?: number;
}): Promise<Airline[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.airlineTypeId !== undefined) params.set("airlineTypeId", String(options.airlineTypeId));
  const qs = params.toString();
  const res = await fetch(`/api/airlines${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AirlinesApiError(await parseError(res), res.status);
  return ((await res.json()) as Parameters<typeof toAppAirline>[0][]).map(toAppAirline);
}

export async function createAirline(input: {
  airlineTypeId: number;
  airlineCode: string;
  airlineName: string;
  airlineNumericCode?: number | null;
  pnrMaxDigit: number;
  tktMaxDigit: number;
  isTktNumberOnly?: boolean;
  isActive?: boolean;
  createdBy: number;
}): Promise<Airline> {
  const res = await fetch("/api/airlines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AirlinesApiError(await parseError(res), res.status);
  return toAppAirline(await res.json());
}

export async function updateAirline(
  airlineId: number,
  input: {
    airlineTypeId: number;
    airlineCode: string;
    airlineName: string;
    airlineNumericCode?: number | null;
    pnrMaxDigit: number;
    tktMaxDigit: number;
    isTktNumberOnly?: boolean;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<Airline> {
  const res = await fetch(`/api/airlines/${airlineId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AirlinesApiError(await parseError(res), res.status);
  return toAppAirline(await res.json());
}

export async function setAirlineActive(
  airlineId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Airline> {
  const res = await fetch(`/api/airlines/${airlineId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new AirlinesApiError(await parseError(res), res.status);
  return toAppAirline(await res.json());
}

export async function deleteAirline(airlineId: number): Promise<void> {
  const res = await fetch(`/api/airlines/${airlineId}`, { method: "DELETE" });
  if (!res.ok) throw new AirlinesApiError(await parseError(res), res.status);
}
