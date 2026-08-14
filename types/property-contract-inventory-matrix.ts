export interface PropertyContractInventoryMatrixCell {
  propertyContractInventoryId?: number;
  propertyRoomId: number;
  allotmentQty: number | null;
  releaseDays: number | null;
  isStopSell: boolean;
  isClosed: boolean;
}

export interface PropertyContractInventoryMatrixPayload {
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  inventoryTypeId: number;
  seasonName?: string;
  seasonCode?: string;
  fromDate?: string;
  toDate?: string;
  inventoryTypes: {
    inventoryTypeId: number;
    inventoryTypeCode: string;
    inventoryTypeName: string;
    displayOrder: number;
  }[];
  rooms: { propertyRoomId: number; roomCode: string; roomName: string; displayOrder: number }[];
  cells: PropertyContractInventoryMatrixCell[];
}
