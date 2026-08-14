export interface PropertyContractPromotionPeriod {
  id: string;
  propertyContractPromotionPeriodKey: number;
  bookingFromDate: string;
  bookingToDate: string;
  stayFromDate: string;
  stayToDate: string;
  isActive: boolean;
}

export interface PropertyContractPromotionCondition {
  id: string;
  propertyContractPromotionConditionKey: number;
  minNights: number | null;
  maxNights: number | null;
  minAdults: number | null;
  maxAdults: number | null;
  minChild: number | null;
  maxChild: number | null;
  minRooms: number | null;
  maxRooms: number | null;
  isActive: boolean;
}

export interface PropertyContractPromotionBenefit {
  id: string;
  propertyContractPromotionBenefitKey: number;
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
}

export interface PropertyContractPromotion {
  id: string;
  propertyContractPromotionKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  promotionTypeId: number;
  promotionTypeCode?: string;
  promotionTypeName?: string;
  promotionCode: string;
  promotionName: string;
  propertyRoomId: number | null;
  roomCode?: string;
  roomName?: string;
  propertyContractRatePlanId: number | null;
  ratePlanCode?: string;
  ratePlanName?: string;
  isStackable: boolean;
  priority: number;
  isActive: boolean;
  periods: PropertyContractPromotionPeriod[];
  conditions: PropertyContractPromotionCondition[];
  benefits: PropertyContractPromotionBenefit[];
  dayOfWeekIds: number[];
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface PropertyContractPromotionWrite {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  promotionTypeId: number;
  promotionCode: string;
  promotionName: string;
  propertyRoomId?: number | null;
  propertyContractRatePlanId?: number | null;
  isStackable?: boolean;
  priority?: number;
  isActive?: boolean;
  periods?: {
    bookingFromDate: string;
    bookingToDate: string;
    stayFromDate: string;
    stayToDate: string;
    isActive?: boolean;
  }[];
  condition?: {
    minNights?: number | null;
    maxNights?: number | null;
    minAdults?: number | null;
    maxAdults?: number | null;
    minChild?: number | null;
    maxChild?: number | null;
    minRooms?: number | null;
    maxRooms?: number | null;
    isActive?: boolean;
  };
  benefits?: {
    promotionBenefitTypeId: number;
    value?: number | null;
    stayNights?: number | null;
    payNights?: number | null;
    freeNights?: number | null;
    upgradeToPropertyRoomId?: number | null;
    upgradeToMealPlanId?: number | null;
    isActive?: boolean;
  }[];
  dayOfWeekIds?: number[];
}
