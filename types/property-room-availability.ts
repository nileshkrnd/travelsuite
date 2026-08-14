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
  availableUnits: number;
  stopSell: boolean;
  minLengthOfStay: number | null;
  maxLengthOfStay: number | null;
}

export interface AvailabilityCalendarPayload {
  year: number;
  month: number;
  propertyId: number;
  rooms: AvailabilityCalendarRoom[];
  cells: AvailabilityCalendarCell[];
  days: string[];
}

export interface AvailabilityCalendarUpdate {
  propertyRoomId: number;
  availabilityDate: string;
  availableUnits: number;
  stopSell?: boolean;
  minLengthOfStay?: number | null;
  maxLengthOfStay?: number | null;
}
