import type { RoomType } from "@/types";
import { toAppRoomType, type RoomTypeRow } from "@/lib/mappers/room-type.mapper";

export class RoomTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RoomTypesApiError";
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

export async function listRoomTypes(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
  roomCategoryId?: number;
}): Promise<RoomType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  if (options?.roomCategoryId) params.set("roomCategoryId", String(options.roomCategoryId));
  const qs = params.toString();
  const res = await fetch(`/api/room-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RoomTypesApiError(await parseError(res), res.status);
  const data = (await res.json()) as RoomTypeRow[];
  return data.map(toAppRoomType);
}

export interface RoomTypeWriteInput {
  roomCategoryId: number;
  roomTypeCode: string;
  roomTypeName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createRoomType(input: RoomTypeWriteInput & { createdBy: number }): Promise<RoomType> {
  const res = await fetch("/api/room-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RoomTypesApiError(await parseError(res), res.status);
  return toAppRoomType(await res.json());
}

export async function updateRoomType(
  roomTypeId: number,
  input: RoomTypeWriteInput & { modifiedBy: number }
): Promise<RoomType> {
  const res = await fetch(`/api/room-types/${roomTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RoomTypesApiError(await parseError(res), res.status);
  return toAppRoomType(await res.json());
}

export async function setRoomTypeActive(
  roomTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<RoomType> {
  const res = await fetch(`/api/room-types/${roomTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new RoomTypesApiError(await parseError(res), res.status);
  return toAppRoomType(await res.json());
}

export async function deleteRoomType(roomTypeId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/room-types/${roomTypeId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new RoomTypesApiError(await parseError(res), res.status);
}
