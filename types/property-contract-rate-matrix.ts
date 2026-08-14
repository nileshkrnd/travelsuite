/** Applicable day link on a contracted rate. */
export interface PropertyContractRateDay {
  propertyContractRateDayId: number;
  propertyContractRateId: number;
  dayOfWeekId: number;
  dayOfWeekCode?: string;
  dayOfWeekName?: string;
  shortName?: string;
  isActive: boolean;
}

export interface PropertyContractRateMatrixCell {
  propertyContractRateId?: number;
  propertyContractRatePlanId: number;
  propertyRoomId: number;
  occupancyTypeId: number;
  rateAmount: number | null;
}

export interface PropertyContractRateMatrixColumn {
  propertyContractRatePlanId: number;
  ratePlanCode: string;
  ratePlanName: string;
  mealPlanId: number;
  mealPlanCode: string;
  mealPlanName: string;
  displayOrder: number;
}

export interface PropertyContractRateMatrixPayload {
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  ratePlanTypeId: number;
  seasonName?: string;
  seasonCode?: string;
  fromDate?: string;
  toDate?: string;
  currencyCode?: string;
  dayOfWeekIds: number[];
  columns: PropertyContractRateMatrixColumn[];
  rooms: { propertyRoomId: number; roomCode: string; roomName: string; displayOrder: number }[];
  occupancies: { occupancyTypeId: number; occupancyTypeCode: string; occupancyTypeName: string; displayOrder: number }[];
  cells: PropertyContractRateMatrixCell[];
}
