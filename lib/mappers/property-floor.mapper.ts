import type { PropertyFloor } from "@/types";

export interface PropertyFloorRow {
  propertyFloorId: bigint | number;
  propertyId: number;
  floorCode: string;
  floorNumber: number;
  floorName: string;
  floorTypeId: bigint | number;
  displayOrder: number;
  totalUnits: number | null;
  occupiedUnits: number | null;
  availableUnits: number | null;
  floorArea: { toString(): string } | number | string | null;
  areaUnitId: bigint | number | null;
  description: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  property?: { propertyCode: string; propertyName: string | null; propertyDisplayName: string | null } | null;
  floorType?: { floorTypeName: string } | null;
  areaUnit?: { roomSizeUnitName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toNumber(value: { toString(): string } | number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function toAppPropertyFloor(row: PropertyFloorRow): PropertyFloor {
  return {
    propertyFloorId: Number(row.propertyFloorId),
    propertyId: row.propertyId,
    floorCode: row.floorCode,
    floorNumber: row.floorNumber,
    floorName: row.floorName,
    floorTypeId: Number(row.floorTypeId),
    displayOrder: row.displayOrder,
    totalUnits: row.totalUnits,
    occupiedUnits: row.occupiedUnits,
    availableUnits: row.availableUnits,
    floorArea: toNumber(row.floorArea),
    areaUnitId: row.areaUnitId != null ? Number(row.areaUnitId) : null,
    description: row.description,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    propertyCode: row.property?.propertyCode,
    propertyName: row.property?.propertyDisplayName || row.property?.propertyName || row.property?.propertyCode,
    floorTypeName: row.floorType?.floorTypeName,
    areaUnitName: row.areaUnit?.roomSizeUnitName,
  };
}
