import type { PropertyRoom } from "@/types";

export interface PropertyRoomRow {
  propertyRoomId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyId: number;
  roomTypeId: bigint | number;
  roomCode: string;
  roomName: string;
  description: string | null;
  maxAdult: number;
  maxChild: number;
  maxOccupancy: number;
  roomSize: { toString(): string } | number | string | null;
  roomSizeUnitId: bigint | number | null;
  smokingTypeId: bigint | number | null;
  viewTypeId: bigint | number | null;
  extraBedAllowed: boolean;
  maxExtraBed: number;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  property?: { propertyName: string | null; propertyCode: string } | null;
  roomType?: { roomTypeCode: string; roomTypeName: string } | null;
  roomSizeUnit?: { roomSizeUnitCode: string; roomSizeUnitName: string } | null;
  smokingType?: { smokingTypeCode: string; smokingTypeName: string } | null;
  viewType?: { viewTypeCode: string; viewTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toNumberOrNull(value: { toString(): string } | number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function toAppPropertyRoom(row: PropertyRoomRow): PropertyRoom {
  return {
    id: String(row.propertyRoomId),
    propertyRoomKey: Number(row.propertyRoomId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyId: row.propertyId,
    propertyName: row.property?.propertyName ?? row.property?.propertyCode,
    propertyCode: row.property?.propertyCode,
    roomTypeId: Number(row.roomTypeId),
    roomTypeCode: row.roomType?.roomTypeCode,
    roomTypeName: row.roomType?.roomTypeName,
    roomCode: row.roomCode,
    roomName: row.roomName,
    description: row.description,
    maxAdult: row.maxAdult,
    maxChild: row.maxChild,
    maxOccupancy: row.maxOccupancy,
    roomSize: toNumberOrNull(row.roomSize),
    roomSizeUnitId: row.roomSizeUnitId == null ? null : Number(row.roomSizeUnitId),
    roomSizeUnitCode: row.roomSizeUnit?.roomSizeUnitCode,
    roomSizeUnitName: row.roomSizeUnit?.roomSizeUnitName,
    smokingTypeId: row.smokingTypeId == null ? null : Number(row.smokingTypeId),
    smokingTypeCode: row.smokingType?.smokingTypeCode,
    smokingTypeName: row.smokingType?.smokingTypeName,
    viewTypeId: row.viewTypeId == null ? null : Number(row.viewTypeId),
    viewTypeCode: row.viewType?.viewTypeCode,
    viewTypeName: row.viewType?.viewTypeName,
    extraBedAllowed: row.extraBedAllowed,
    maxExtraBed: row.maxExtraBed,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
