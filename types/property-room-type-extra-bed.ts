/** Extra-bed policy for a Property's room type — which bed types may be added, limits, and eligibility. */
export interface PropertyRoomTypeExtraBed {
  id: string;
  propertyRoomTypeExtraBedKey: number;
  tenantKey: number;
  companyKey: number;
  propertyRoomId: number;
  extraBedTypeId: number;
  extraBedTypeCode?: string;
  extraBedTypeName?: string;
  maxQuantity: number;
  adultAllowed: boolean;
  childAllowed: boolean;
  isComplimentary: boolean;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
