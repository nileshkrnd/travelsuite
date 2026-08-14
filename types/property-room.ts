/** Property-specific room type — maps a property room to a global RoomType with occupancy and attributes. */
export interface PropertyRoom {
  id: string;
  propertyRoomKey: number;
  tenantKey: number;
  companyKey: number;
  propertyId: number;
  propertyName?: string;
  propertyCode?: string;
  roomTypeId: number;
  roomTypeCode?: string;
  roomTypeName?: string;
  roomCode: string;
  roomName: string;
  description: string | null;
  maxAdult: number;
  maxChild: number;
  maxOccupancy: number;
  roomSize: number | null;
  roomSizeUnitId: number | null;
  roomSizeUnitCode?: string;
  roomSizeUnitName?: string;
  smokingTypeId: number | null;
  smokingTypeCode?: string;
  smokingTypeName?: string;
  viewTypeId: number | null;
  viewTypeCode?: string;
  viewTypeName?: string;
  extraBedAllowed: boolean;
  maxExtraBed: number;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
