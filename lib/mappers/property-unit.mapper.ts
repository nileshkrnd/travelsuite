import type { PropertyUnit } from "@/types";

export interface PropertyUnitRow {
  unitId: bigint | number;
  propertyId: number;
  propertyFloorId: bigint | number;
  unitCode: string;
  unitNumber: string;
  unitName: string | null;
  unitTypeId: bigint | number;
  unitCategoryId: bigint | number | null;
  unitStatusId: bigint | number;
  area: { toString(): string } | number | string;
  areaUnitId: bigint | number;
  bedroomCount: number | null;
  bathroomCount: number | null;
  parkingCount: number | null;
  balconyCount: number | null;
  furnishedStatusId: bigint | number | null;
  viewTypeId: bigint | number | null;
  unitDescription: string | null;
  isRentable: boolean;
  isSaleable: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  property?: { propertyCode: string; propertyName: string | null; propertyDisplayName: string | null } | null;
  floor?: { floorCode: string; floorName: string } | null;
  unitType?: { unitTypeName: string } | null;
  unitCategory?: { unitCategoryName: string } | null;
  unitStatus?: { statusName: string; statusCode: string } | null;
  areaUnit?: { roomSizeUnitName: string } | null;
  furnishedStatus?: { furnishedStatusName: string } | null;
  viewType?: { viewTypeName: string } | null;
  blockReason?: string | null;
  currentTenantId?: number | null;
  currentTenantCode?: string | null;
  currentTenantName?: string | null;
  allocatedFrom?: string | null;
  allocations?: Array<{
    allocatedFrom: Date | string;
    propertyTenant: { propertyTenantId: bigint | number; tenantCode: string; tenantName: string };
  }>;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toNumber(value: { toString(): string } | number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

export function toAppPropertyUnit(row: PropertyUnitRow): PropertyUnit {
  return {
    unitId: Number(row.unitId),
    propertyId: row.propertyId,
    propertyFloorId: Number(row.propertyFloorId),
    unitCode: row.unitCode,
    unitNumber: row.unitNumber,
    unitName: row.unitName,
    unitTypeId: Number(row.unitTypeId),
    unitCategoryId: row.unitCategoryId != null ? Number(row.unitCategoryId) : null,
    unitStatusId: Number(row.unitStatusId),
    area: toNumber(row.area),
    areaUnitId: Number(row.areaUnitId),
    bedroomCount: row.bedroomCount,
    bathroomCount: row.bathroomCount,
    parkingCount: row.parkingCount,
    balconyCount: row.balconyCount,
    furnishedStatusId: row.furnishedStatusId != null ? Number(row.furnishedStatusId) : null,
    viewTypeId: row.viewTypeId != null ? Number(row.viewTypeId) : null,
    unitDescription: row.unitDescription,
    isRentable: row.isRentable,
    isSaleable: row.isSaleable,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    propertyCode: row.property?.propertyCode,
    propertyName: row.property?.propertyDisplayName || row.property?.propertyName || row.property?.propertyCode,
    floorCode: row.floor?.floorCode,
    floorName: row.floor?.floorName,
    unitTypeName: row.unitType?.unitTypeName,
    unitCategoryName: row.unitCategory?.unitCategoryName,
    unitStatusName: row.unitStatus?.statusName,
    unitStatusCode: row.unitStatus?.statusCode,
    areaUnitName: row.areaUnit?.roomSizeUnitName,
    furnishedStatusName: row.furnishedStatus?.furnishedStatusName,
    viewTypeName: row.viewType?.viewTypeName,
    blockReason: row.blockReason ?? null,
    currentTenantId: row.allocations?.[0]
      ? Number(row.allocations[0].propertyTenant.propertyTenantId)
      : row.currentTenantId ?? null,
    currentTenantCode: row.allocations?.[0]?.propertyTenant.tenantCode ?? row.currentTenantCode ?? null,
    currentTenantName: row.allocations?.[0]?.propertyTenant.tenantName ?? row.currentTenantName ?? null,
    allocatedFrom: row.allocatedFrom ?? (row.allocations?.[0] ? String(row.allocations[0].allocatedFrom).slice(0, 10) : null),
  };
}
