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

export interface AvailabilityCalendarCell {
  propertyRoomAvailabilityKey?: number;
  propertyRoomId: number;
  availabilityDate: string;
  availableUnits?: number | null;
  stopSell?: boolean;
  minLengthOfStay?: number | null;
  maxLengthOfStay?: number | null;
  contractRate?: number | null;
  inventoryAllotment?: number | null;
  dailyRateAmount?: number | null;
  dailyInventoryQty?: number | null;
  contractInventoryStopSell?: boolean;
  contractInventoryClosed?: boolean;
}

export interface AvailabilityCalendarPayload {
  year: number;
  month: number;
  propertyId: number;
  currencyCode?: string | null;
  rooms: AvailabilityCalendarRoom[];
  cells: AvailabilityCalendarCell[];
  days: string[];
}

export interface AvailabilityCalendarUpdate {
  propertyRoomId: number;
  availabilityDate: string;
  availableUnits: number;
  stopSell?: boolean;
  dailyRateAmount?: number | null;
  dailyInventoryQty?: number | null;
  minLengthOfStay?: number | null;
  maxLengthOfStay?: number | null;
}
