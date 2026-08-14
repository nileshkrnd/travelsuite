/** Contracted rate for season period + rate plan + room type + occupancy. */
export interface PropertyContractRate {
  id: string;
  propertyContractRateKey: number;
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
  propertyContractRatePlanId: number;
  ratePlanCode?: string;
  ratePlanName?: string;
  ratePlanTypeId?: number;
  ratePlanTypeCode?: string;
  ratePlanTypeName?: string;
  mealPlanCode?: string;
  mealPlanName?: string;
  propertyRoomId: number;
  roomCode?: string;
  roomName?: string;
  occupancyTypeId: number;
  occupancyTypeCode?: string;
  occupancyTypeName?: string;
  rateAmount: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
