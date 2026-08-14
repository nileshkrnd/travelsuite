import type { RoomSizeUnit } from "@/types";

export interface RoomSizeUnitRow {
  roomSizeUnitId: number;
  roomSizeUnitCode: string;
  roomSizeUnitName: string;
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

export function toAppRoomSizeUnit(row: RoomSizeUnitRow): RoomSizeUnit {
  return {
    id: String(row.roomSizeUnitId),
    roomSizeUnitKey: row.roomSizeUnitId,
    code: row.roomSizeUnitCode,
    name: row.roomSizeUnitName,
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
