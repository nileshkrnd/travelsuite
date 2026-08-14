/** Media (photos/videos/virtual tours) for a Property's room type. */
export interface PropertyRoomTypeMedia {
  id: string;
  propertyRoomTypeMediaKey: number;
  tenantKey: number;
  companyKey: number;
  propertyId: number;
  propertyRoomId: number;
  mediaTypeId: number;
  mediaTypeName?: string;
  mediaCategoryId: number;
  mediaCategoryName?: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  altText: string | null;
  caption: string | null;
  displayOrder: number;
  isPrimary: boolean;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
