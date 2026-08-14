import type { RoomSizeUnit } from "@/types";
import { toAppRoomSizeUnit, type RoomSizeUnitRow } from "@/lib/mappers/room-size-unit.mapper";

export class RoomSizeUnitsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RoomSizeUnitsApiError";
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

export async function listRoomSizeUnits(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<RoomSizeUnit[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/room-size-units${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RoomSizeUnitsApiError(await parseError(res), res.status);
  return ((await res.json()) as RoomSizeUnitRow[]).map(toAppRoomSizeUnit);
}
