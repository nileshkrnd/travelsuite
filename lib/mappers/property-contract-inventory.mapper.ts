import type { InventoryType, PropertyContractInventory } from "@/types/property-contract-inventory";

export interface InventoryTypeRow {
  inventoryTypeId: bigint | number;
  inventoryTypeCode: string;
  inventoryTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface PropertyContractInventoryRow {
  propertyContractInventoryId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyContractId: bigint | number;
  propertyContractSeasonPeriodId: bigint | number;
  propertyRoomId: bigint | number;
  inventoryTypeId: bigint | number;
  allotmentQty: number;
  releaseDays: number;
  isStopSell: boolean;
  isClosed: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  seasonPeriod?: {
    fromDate: Date | string;
    toDate: Date | string;
    propertySeason?: { seasonCode: string; seasonName: string } | null;
  } | null;
  propertyRoom?: { roomCode: string; roomName: string } | null;
  inventoryType?: { inventoryTypeCode: string; inventoryTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function toAppInventoryType(row: InventoryTypeRow): InventoryType {
  return {
    id: String(row.inventoryTypeId),
    inventoryTypeKey: Number(row.inventoryTypeId),
    inventoryTypeCode: row.inventoryTypeCode,
    inventoryTypeName: row.inventoryTypeName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}

export function toAppPropertyContractInventory(row: PropertyContractInventoryRow): PropertyContractInventory {
  return {
    id: String(row.propertyContractInventoryId),
    propertyContractInventoryKey: Number(row.propertyContractInventoryId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: Number(row.propertyContractId),
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    propertyContractSeasonPeriodId: Number(row.propertyContractSeasonPeriodId),
    seasonCode: row.seasonPeriod?.propertySeason?.seasonCode,
    seasonName: row.seasonPeriod?.propertySeason?.seasonName,
    fromDate: toDateOnly(row.seasonPeriod?.fromDate) ?? undefined,
    toDate: toDateOnly(row.seasonPeriod?.toDate) ?? undefined,
    propertyRoomId: Number(row.propertyRoomId),
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
    inventoryTypeId: Number(row.inventoryTypeId),
    inventoryTypeCode: row.inventoryType?.inventoryTypeCode,
    inventoryTypeName: row.inventoryType?.inventoryTypeName,
    allotmentQty: row.allotmentQty,
    releaseDays: row.releaseDays,
    isStopSell: row.isStopSell,
    isClosed: row.isClosed,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
