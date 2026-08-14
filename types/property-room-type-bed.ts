/** Bed configuration for a Property's room type — which bed types and how many. */
export interface PropertyRoomTypeBed {
  id: string;
  propertyRoomTypeBedKey: number;
  tenantKey: number;
  companyKey: number;
  propertyRoomId: number;
  bedTypeId: number;
  bedTypeCode?: string;
  bedTypeName?: string;
  bedCount: number;
  isExtraBed: boolean;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
