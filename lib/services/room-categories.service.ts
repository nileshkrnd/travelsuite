import type { RoomCategory } from "@/types";
import { toAppRoomCategory, type RoomCategoryRow } from "@/lib/mappers/room-category.mapper";

export class RoomCategoriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RoomCategoriesApiError";
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

export async function listRoomCategories(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<RoomCategory[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/room-categories${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RoomCategoriesApiError(await parseError(res), res.status);
  const data = (await res.json()) as RoomCategoryRow[];
  return data.map(toAppRoomCategory);
}

export interface RoomCategoryWriteInput {
  roomCategoryCode: string;
  roomCategoryName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createRoomCategory(
  input: RoomCategoryWriteInput & { createdBy: number }
): Promise<RoomCategory> {
  const res = await fetch("/api/room-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RoomCategoriesApiError(await parseError(res), res.status);
  return toAppRoomCategory(await res.json());
}

export async function updateRoomCategory(
  roomCategoryId: number,
  input: RoomCategoryWriteInput & { modifiedBy: number }
): Promise<RoomCategory> {
  const res = await fetch(`/api/room-categories/${roomCategoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RoomCategoriesApiError(await parseError(res), res.status);
  return toAppRoomCategory(await res.json());
}

export async function setRoomCategoryActive(
  roomCategoryId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<RoomCategory> {
  const res = await fetch(`/api/room-categories/${roomCategoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new RoomCategoriesApiError(await parseError(res), res.status);
  return toAppRoomCategory(await res.json());
}

export async function deleteRoomCategory(roomCategoryId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/room-categories/${roomCategoryId}?modifiedBy=${modifiedBy}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new RoomCategoriesApiError(await parseError(res), res.status);
}
