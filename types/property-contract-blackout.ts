export interface PropertyContractBlackout {
  id: string;
  propertyContractBlackoutKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  blackoutTypeId: number;
  blackoutTypeCode?: string;
  blackoutTypeName?: string;
  propertyRoomId: number | null;
  roomCode?: string;
  roomName?: string;
  propertyContractRatePlanId: number | null;
  ratePlanCode?: string;
  ratePlanName?: string;
  fromDate: string;
  toDate: string;
  blackoutReasonId: number | null;
  blackoutReasonCode?: string;
  blackoutReasonName?: string;
  remarks: string | null;
  isActive: boolean;
  dayOfWeekIds: number[];
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface PropertyContractBlackoutWrite {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  blackoutTypeId: number;
  propertyRoomId?: number | null;
  propertyContractRatePlanId?: number | null;
  fromDate: string;
  toDate: string;
  blackoutReasonId?: number | null;
  remarks?: string | null;
  isActive?: boolean;
  dayOfWeekIds?: number[];
}
