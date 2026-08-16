/** Daily availability for a property room type on a specific date. */
export interface PropertyRoomAvailability {
  id: string;
  propertyRoomAvailabilityKey: number;
  tenantKey: number;
  companyKey: number;
  propertyId: number;
  propertyRoomId: number;
  roomCode?: string;
  roomName?: string;
  availabilityDate: string;
  availableUnits: number;
  stopSell: boolean;
  /** Closed to arrival (CTA) — no check-in on this date. */
  closedToArrival: boolean;
  /** Closed to departure (CTD) — no check-out on this date. */
  closedToDeparture: boolean;
  minLengthOfStay: number | null;
  maxLengthOfStay: number | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

export interface AvailabilityCalendarRoom {
  propertyRoomId: number;
  roomCode: string;
  roomName: string;
}

export interface AvailabilityCalendarRatePlan {
  propertyContractRatePlanId: number;
  propertyContractId: number;
  contractLabel?: string | null;
  ratePlanCode: string;
  ratePlanName: string;
  mealPlanCode: string;
  mealPlanName: string;
  ratePlanTypeCode?: string | null;
  ratePlanTypeName?: string | null;
  displayOrder: number;
}

export interface AvailabilityCalendarOccupancy {
  occupancyTypeId: number;
  occupancyTypeCode: string;
  occupancyTypeName: string;
  displayOrder: number;
}

export interface AvailabilityCalendarOccupancyRate {
  propertyContractRatePlanId: number;
  occupancyTypeId: number;
  /** Contract-level default rate for this plan + occupancy on this date; null if no contract rate applies. */
  contractRateAmount: number | null;
  /** Daily override; null means use the contract rate. */
  dailyRateAmount: number | null;
}

export interface AvailabilityCalendarCell {
  propertyRoomAvailabilityKey?: number;
  propertyRoomId: number;
  availabilityDate: string;
  availableUnits?: number | null;
  stopSell?: boolean;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  /** Daily override; falls back to contractMinLengthOfStay when null. */
  minLengthOfStay?: number | null;
  /** Daily override; falls back to contractMaxLengthOfStay when null. */
  maxLengthOfStay?: number | null;
  /** Default min LOS from the contract season period covering this date. */
  contractMinLengthOfStay?: number | null;
  /** Default max LOS from the contract season period covering this date. */
  contractMaxLengthOfStay?: number | null;
  contractRate?: number | null;
  occupancyRates?: AvailabilityCalendarOccupancyRate[];
  inventoryAllotment?: number | null;
  dailyRateAmount?: number | null;
  dailyInventoryQty?: number | null;
  contractInventoryStopSell?: boolean;
  contractInventoryClosed?: boolean;
  /** Active contract stop-sale period applies to this room/day. */
  contractStopSale?: boolean;
  /** Active contract blackout applies to this room/day. */
  contractBlackout?: boolean;
}

export interface AvailabilityCalendarPayload {
  year: number;
  month: number;
  propertyId: number;
  currencyCode?: string | null;
  rooms: AvailabilityCalendarRoom[];
  ratePlans: AvailabilityCalendarRatePlan[];
  occupancies: AvailabilityCalendarOccupancy[];
  cells: AvailabilityCalendarCell[];
  days: string[];
}

export interface AvailabilityCalendarUpdate {
  propertyRoomId: number;
  availabilityDate: string;
  availableUnits?: number;
  stopSell?: boolean;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  dailyRateAmount?: number | null;
  dailyInventoryQty?: number | null;
  minLengthOfStay?: number | null;
  maxLengthOfStay?: number | null;
  /** Per rate-plan + occupancy daily rate overrides; a null rateAmount clears the override back to the contract rate. */
  occupancyRateOverrides?: {
    propertyContractRatePlanId: number;
    occupancyTypeId: number;
    rateAmount: number | null;
  }[];
}
