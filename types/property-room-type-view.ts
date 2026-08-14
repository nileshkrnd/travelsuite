/** View configuration for a Property's room type — which views apply, with one optional primary view. */
export interface PropertyRoomTypeView {
  id: string;
  propertyRoomTypeViewKey: number;
  tenantKey: number;
  companyKey: number;
  propertyRoomId: number;
  viewTypeId: number;
  viewTypeCode?: string;
  viewTypeName?: string;
  isPrimary: boolean;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
