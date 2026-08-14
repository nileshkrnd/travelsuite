import type { BlackoutReason } from "@/types/blackout-reason";
import type { BlackoutType } from "@/types/blackout-type";
import type { PropertyContractBlackout } from "@/types/property-contract-blackout";

export type BlackoutTypeRow = {
  blackoutTypeId: number;
  tenantId: number;
  companyId: number;
  blackoutTypeCode: string;
  blackoutTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type BlackoutReasonRow = {
  blackoutReasonId: number;
  tenantId: number;
  companyId: number;
  blackoutReasonCode: string;
  blackoutReasonName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type PropertyContractBlackoutRow = {
  propertyContractBlackoutId: number;
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  blackoutTypeId: number;
  propertyRoomId: number | null;
  propertyContractRatePlanId: number | null;
  fromDate: string;
  toDate: string;
  blackoutReasonId: number | null;
  remarks: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  contractNumber?: string;
  contractName?: string;
  blackoutTypeCode?: string;
  blackoutTypeName?: string;
  roomCode?: string;
  roomName?: string;
  ratePlanCode?: string;
  ratePlanName?: string;
  blackoutReasonCode?: string;
  blackoutReasonName?: string;
  dayOfWeekIds?: number[];
};

export function toAppBlackoutType(row: BlackoutTypeRow): BlackoutType {
  return {
    id: String(row.blackoutTypeId),
    blackoutTypeKey: row.blackoutTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    blackoutTypeCode: row.blackoutTypeCode,
    blackoutTypeName: row.blackoutTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppBlackoutReason(row: BlackoutReasonRow): BlackoutReason {
  return {
    id: String(row.blackoutReasonId),
    blackoutReasonKey: row.blackoutReasonId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    blackoutReasonCode: row.blackoutReasonCode,
    blackoutReasonName: row.blackoutReasonName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppPropertyContractBlackout(row: PropertyContractBlackoutRow): PropertyContractBlackout {
  return {
    id: String(row.propertyContractBlackoutId),
    propertyContractBlackoutKey: row.propertyContractBlackoutId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: row.propertyContractId,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    blackoutTypeId: row.blackoutTypeId,
    blackoutTypeCode: row.blackoutTypeCode,
    blackoutTypeName: row.blackoutTypeName,
    propertyRoomId: row.propertyRoomId,
    roomCode: row.roomCode,
    roomName: row.roomName,
    propertyContractRatePlanId: row.propertyContractRatePlanId,
    ratePlanCode: row.ratePlanCode,
    ratePlanName: row.ratePlanName,
    fromDate: row.fromDate,
    toDate: row.toDate,
    blackoutReasonId: row.blackoutReasonId,
    blackoutReasonCode: row.blackoutReasonCode,
    blackoutReasonName: row.blackoutReasonName,
    remarks: row.remarks,
    isActive: row.isActive,
    dayOfWeekIds: row.dayOfWeekIds ?? [],
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
