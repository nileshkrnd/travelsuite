import type { StopSaleReason } from "@/types/stop-sale-reason";
import type { StopSaleType } from "@/types/stop-sale-type";
import type { PropertyContractStopSale } from "@/types/property-contract-stop-sale";

export type StopSaleTypeRow = {
  stopSaleTypeId: number;
  tenantId: number;
  companyId: number;
  stopSaleTypeCode: string;
  stopSaleTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type StopSaleReasonRow = {
  stopSaleReasonId: number;
  tenantId: number;
  companyId: number;
  stopSaleReasonCode: string;
  stopSaleReasonName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type PropertyContractStopSaleRow = {
  propertyContractStopSaleId: number;
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  stopSaleTypeId: number;
  propertyRoomId: number | null;
  propertyContractRatePlanId: number | null;
  fromDate: string;
  toDate: string;
  stopSaleReasonId: number | null;
  remarks: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  contractNumber?: string;
  contractName?: string;
  stopSaleTypeCode?: string;
  stopSaleTypeName?: string;
  roomCode?: string;
  roomName?: string;
  ratePlanCode?: string;
  ratePlanName?: string;
  stopSaleReasonCode?: string;
  stopSaleReasonName?: string;
  dayOfWeekIds?: number[];
};

export function toAppStopSaleType(row: StopSaleTypeRow): StopSaleType {
  return {
    id: String(row.stopSaleTypeId),
    stopSaleTypeKey: row.stopSaleTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    stopSaleTypeCode: row.stopSaleTypeCode,
    stopSaleTypeName: row.stopSaleTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppStopSaleReason(row: StopSaleReasonRow): StopSaleReason {
  return {
    id: String(row.stopSaleReasonId),
    stopSaleReasonKey: row.stopSaleReasonId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    stopSaleReasonCode: row.stopSaleReasonCode,
    stopSaleReasonName: row.stopSaleReasonName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppPropertyContractStopSale(row: PropertyContractStopSaleRow): PropertyContractStopSale {
  return {
    id: String(row.propertyContractStopSaleId),
    propertyContractStopSaleKey: row.propertyContractStopSaleId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: row.propertyContractId,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    stopSaleTypeId: row.stopSaleTypeId,
    stopSaleTypeCode: row.stopSaleTypeCode,
    stopSaleTypeName: row.stopSaleTypeName,
    propertyRoomId: row.propertyRoomId,
    roomCode: row.roomCode,
    roomName: row.roomName,
    propertyContractRatePlanId: row.propertyContractRatePlanId,
    ratePlanCode: row.ratePlanCode,
    ratePlanName: row.ratePlanName,
    fromDate: row.fromDate,
    toDate: row.toDate,
    stopSaleReasonId: row.stopSaleReasonId,
    stopSaleReasonCode: row.stopSaleReasonCode,
    stopSaleReasonName: row.stopSaleReasonName,
    remarks: row.remarks,
    isActive: row.isActive,
    dayOfWeekIds: row.dayOfWeekIds ?? [],
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
