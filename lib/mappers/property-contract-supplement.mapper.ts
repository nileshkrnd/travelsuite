import type {
  PropertyContractSupplement,
  PropertyContractSupplementAge,
  PropertyContractSupplementPeriod,
  PropertyContractSupplementRatePlan,
} from "@/types/property-contract-supplement";
import type { SupplementType } from "@/types/supplement-type";

export type SupplementTypeRow = {
  supplementTypeId: number;
  tenantId: number;
  companyId: number;
  supplementTypeCode: string;
  supplementTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type PropertyContractSupplementRow = {
  propertyContractSupplementId: number;
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  supplementTypeId: number;
  supplementCode: string;
  supplementName: string;
  propertyRoomId: number | null;
  rateBasisId: number;
  amount: number;
  isMandatory: boolean;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  contractNumber?: string;
  contractName?: string;
  supplementTypeCode?: string;
  supplementTypeName?: string;
  roomCode?: string;
  roomName?: string;
  rateBasisCode?: string;
  rateBasisName?: string;
  dayOfWeekIds?: number[];
  periods?: {
    propertyContractSupplementPeriodId: number;
    fromDate: string;
    toDate: string;
    isMandatory: boolean;
    isActive: boolean;
  }[];
  ageBands?: {
    propertyContractSupplementAgeId: number;
    fromAge: number;
    toAge: number;
    rateBasisId: number;
    rateBasisCode?: string;
    rateBasisName?: string;
    amount: number;
    isPercentOfAdultRate: boolean;
    isFree: boolean;
    isActive: boolean;
  }[];
  ratePlans?: {
    propertyContractSupplementRatePlanId: number;
    propertyContractRatePlanId: number;
    ratePlanCode?: string;
    ratePlanName?: string;
    amount: number;
    isActive: boolean;
  }[];
};

export function toAppSupplementType(row: SupplementTypeRow): SupplementType {
  return {
    id: String(row.supplementTypeId),
    supplementTypeKey: row.supplementTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    supplementTypeCode: row.supplementTypeCode,
    supplementTypeName: row.supplementTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppPropertyContractSupplement(row: PropertyContractSupplementRow): PropertyContractSupplement {
  return {
    id: String(row.propertyContractSupplementId),
    propertyContractSupplementKey: row.propertyContractSupplementId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: row.propertyContractId,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    supplementTypeId: row.supplementTypeId,
    supplementTypeCode: row.supplementTypeCode,
    supplementTypeName: row.supplementTypeName,
    supplementCode: row.supplementCode,
    supplementName: row.supplementName,
    propertyRoomId: row.propertyRoomId,
    roomCode: row.roomCode,
    roomName: row.roomName,
    rateBasisId: row.rateBasisId,
    rateBasisCode: row.rateBasisCode,
    rateBasisName: row.rateBasisName,
    amount: row.amount,
    isMandatory: row.isMandatory,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    dayOfWeekIds: row.dayOfWeekIds ?? [],
    periods: (row.periods ?? []).map(
      (p): PropertyContractSupplementPeriod => ({
        id: String(p.propertyContractSupplementPeriodId),
        propertyContractSupplementPeriodKey: p.propertyContractSupplementPeriodId,
        fromDate: p.fromDate,
        toDate: p.toDate,
        isMandatory: p.isMandatory,
        isActive: p.isActive,
      })
    ),
    ageBands: (row.ageBands ?? []).map(
      (a): PropertyContractSupplementAge => ({
        id: String(a.propertyContractSupplementAgeId),
        propertyContractSupplementAgeKey: a.propertyContractSupplementAgeId,
        fromAge: a.fromAge,
        toAge: a.toAge,
        rateBasisId: a.rateBasisId,
        rateBasisCode: a.rateBasisCode,
        rateBasisName: a.rateBasisName,
        amount: a.amount,
        isPercentOfAdultRate: a.isPercentOfAdultRate,
        isFree: a.isFree,
        isActive: a.isActive,
      })
    ),
    ratePlans: (row.ratePlans ?? []).map(
      (rp): PropertyContractSupplementRatePlan => ({
        id: String(rp.propertyContractSupplementRatePlanId),
        propertyContractSupplementRatePlanKey: rp.propertyContractSupplementRatePlanId,
        propertyContractRatePlanId: rp.propertyContractRatePlanId,
        ratePlanCode: rp.ratePlanCode,
        ratePlanName: rp.ratePlanName,
        amount: rp.amount,
        isActive: rp.isActive,
      })
    ),
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
