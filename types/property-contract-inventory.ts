/** Global inventory type — Allotment / Free Sale / On Request. */
export interface InventoryType {
  id: string;
  inventoryTypeKey: number;
  inventoryTypeCode: string;
  inventoryTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

/** Contracted inventory for season period + room type. */
export interface PropertyContractInventory {
  id: string;
  propertyContractInventoryKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  propertyContractSeasonPeriodId: number;
  seasonCode?: string;
  seasonName?: string;
  fromDate?: string;
  toDate?: string;
  propertyRoomId: number;
  roomCode?: string;
  roomName?: string;
  inventoryTypeId: number;
  inventoryTypeCode?: string;
  inventoryTypeName?: string;
  allotmentQty: number;
  releaseDays: number;
  isStopSell: boolean;
  isClosed: boolean;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
