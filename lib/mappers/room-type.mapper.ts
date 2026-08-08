import type { RoomType } from "@/types";

export interface RoomTypeRow {
  roomTypeId: number;
  roomCategoryId: number;
  roomTypeCode: string;
  roomTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  category?: { roomCategoryName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppRoomType(row: RoomTypeRow): RoomType {
  return {
    id: String(row.roomTypeId),
    roomTypeKey: row.roomTypeId,
    roomCategoryKey: row.roomCategoryId,
    roomCategoryName: row.category?.roomCategoryName,
    code: row.roomTypeCode,
    name: row.roomTypeName,
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
