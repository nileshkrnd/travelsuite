export interface PropertyContractStopSale {
  id: string;
  propertyContractStopSaleKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  stopSaleTypeId: number;
  stopSaleTypeCode?: string;
  stopSaleTypeName?: string;
  propertyRoomId: number | null;
  roomCode?: string;
  roomName?: string;
  propertyContractRatePlanId: number | null;
  ratePlanCode?: string;
  ratePlanName?: string;
  fromDate: string;
  toDate: string;
  stopSaleReasonId: number | null;
  stopSaleReasonCode?: string;
  stopSaleReasonName?: string;
  remarks: string | null;
  isActive: boolean;
  dayOfWeekIds: number[];
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface PropertyContractStopSaleWrite {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  stopSaleTypeId: number;
  propertyRoomId?: number | null;
  propertyContractRatePlanId?: number | null;
  fromDate: string;
  toDate: string;
  stopSaleReasonId?: number | null;
  remarks?: string | null;
  isActive?: boolean;
  dayOfWeekIds?: number[];
}
