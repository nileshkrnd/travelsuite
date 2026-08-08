import type { RoomCategory } from "@/types";

export interface RoomCategoryRow {
  roomCategoryId: number;
  roomCategoryCode: string;
  roomCategoryName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppRoomCategory(row: RoomCategoryRow): RoomCategory {
  return {
    id: String(row.roomCategoryId),
    roomCategoryKey: row.roomCategoryId,
    code: row.roomCategoryCode,
    name: row.roomCategoryName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
