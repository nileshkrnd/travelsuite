import type { PromotionBenefitType } from "@/types/promotion-benefit-type";
import type { PromotionType } from "@/types/promotion-type";
import type {
  PropertyContractPromotion,
  PropertyContractPromotionBenefit,
  PropertyContractPromotionCondition,
  PropertyContractPromotionPeriod,
} from "@/types/property-contract-promotion";

export type PromotionTypeRow = {
  promotionTypeId: number;
  tenantId: number;
  companyId: number;
  promotionTypeCode: string;
  promotionTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type PromotionBenefitTypeRow = {
  promotionBenefitTypeId: number;
  tenantId: number;
  companyId: number;
  promotionBenefitTypeCode: string;
  promotionBenefitTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
};

export type PropertyContractPromotionRow = {
  propertyContractPromotionId: number;
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  promotionTypeId: number;
  promotionCode: string;
  promotionName: string;
  propertyRoomId: number | null;
  propertyContractRatePlanId: number | null;
  isStackable: boolean;
  priority: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  contractNumber?: string;
  contractName?: string;
  promotionTypeCode?: string;
  promotionTypeName?: string;
  roomCode?: string;
  roomName?: string;
  ratePlanCode?: string;
  ratePlanName?: string;
  dayOfWeekIds?: number[];
  periods?: {
    propertyContractPromotionPeriodId: number;
    bookingFromDate: string;
    bookingToDate: string;
    stayFromDate: string;
    stayToDate: string;
    isActive: boolean;
  }[];
  conditions?: {
    propertyContractPromotionConditionId: number;
    minNights: number | null;
    maxNights: number | null;
    minAdults: number | null;
    maxAdults: number | null;
    minChild: number | null;
    maxChild: number | null;
    minRooms: number | null;
    maxRooms: number | null;
    isActive: boolean;
  }[];
  benefits?: {
    propertyContractPromotionBenefitId: number;
    promotionBenefitTypeId: number;
    promotionBenefitTypeCode?: string;
    promotionBenefitTypeName?: string;
    value: number | null;
    stayNights: number | null;
    payNights: number | null;
    freeNights: number | null;
    upgradeToPropertyRoomId: number | null;
    upgradeRoomCode?: string;
    upgradeRoomName?: string;
    upgradeToMealPlanId: number | null;
    upgradeMealPlanCode?: string;
    upgradeMealPlanName?: string;
    isActive: boolean;
  }[];
};

export function toAppPromotionType(row: PromotionTypeRow): PromotionType {
  return {
    id: String(row.promotionTypeId),
    promotionTypeKey: row.promotionTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    promotionTypeCode: row.promotionTypeCode,
    promotionTypeName: row.promotionTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppPromotionBenefitType(row: PromotionBenefitTypeRow): PromotionBenefitType {
  return {
    id: String(row.promotionBenefitTypeId),
    promotionBenefitTypeKey: row.promotionBenefitTypeId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    promotionBenefitTypeCode: row.promotionBenefitTypeCode,
    promotionBenefitTypeName: row.promotionBenefitTypeName,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}

export function toAppPropertyContractPromotion(
  row: PropertyContractPromotionRow
): PropertyContractPromotion {
  return {
    id: String(row.propertyContractPromotionId),
    propertyContractPromotionKey: row.propertyContractPromotionId,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: row.propertyContractId,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    promotionTypeId: row.promotionTypeId,
    promotionTypeCode: row.promotionTypeCode,
    promotionTypeName: row.promotionTypeName,
    promotionCode: row.promotionCode,
    promotionName: row.promotionName,
    propertyRoomId: row.propertyRoomId,
    roomCode: row.roomCode,
    roomName: row.roomName,
    propertyContractRatePlanId: row.propertyContractRatePlanId,
    ratePlanCode: row.ratePlanCode,
    ratePlanName: row.ratePlanName,
    isStackable: row.isStackable,
    priority: row.priority,
    isActive: row.isActive,
    periods: (row.periods ?? []).map(
      (p): PropertyContractPromotionPeriod => ({
        id: String(p.propertyContractPromotionPeriodId),
        propertyContractPromotionPeriodKey: p.propertyContractPromotionPeriodId,
        bookingFromDate: p.bookingFromDate,
        bookingToDate: p.bookingToDate,
        stayFromDate: p.stayFromDate,
        stayToDate: p.stayToDate,
        isActive: p.isActive,
      })
    ),
    conditions: (row.conditions ?? []).map(
      (c): PropertyContractPromotionCondition => ({
        id: String(c.propertyContractPromotionConditionId),
        propertyContractPromotionConditionKey: c.propertyContractPromotionConditionId,
        minNights: c.minNights,
        maxNights: c.maxNights,
        minAdults: c.minAdults,
        maxAdults: c.maxAdults,
        minChild: c.minChild,
        maxChild: c.maxChild,
        minRooms: c.minRooms,
        maxRooms: c.maxRooms,
        isActive: c.isActive,
      })
    ),
    benefits: (row.benefits ?? []).map(
      (b): PropertyContractPromotionBenefit => ({
        id: String(b.propertyContractPromotionBenefitId),
        propertyContractPromotionBenefitKey: b.propertyContractPromotionBenefitId,
        promotionBenefitTypeId: b.promotionBenefitTypeId,
        promotionBenefitTypeCode: b.promotionBenefitTypeCode,
        promotionBenefitTypeName: b.promotionBenefitTypeName,
        value: b.value,
        stayNights: b.stayNights,
        payNights: b.payNights,
        freeNights: b.freeNights,
        upgradeToPropertyRoomId: b.upgradeToPropertyRoomId,
        upgradeRoomCode: b.upgradeRoomCode,
        upgradeRoomName: b.upgradeRoomName,
        upgradeToMealPlanId: b.upgradeToMealPlanId,
        upgradeMealPlanCode: b.upgradeMealPlanCode,
        upgradeMealPlanName: b.upgradeMealPlanName,
        isActive: b.isActive,
      })
    ),
    dayOfWeekIds: row.dayOfWeekIds ?? [],
    createdBy: row.createdBy,
    createdAt: row.createdDtTm,
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm,
  };
}
