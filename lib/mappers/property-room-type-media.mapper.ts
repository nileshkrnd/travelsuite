import type { PropertyRoomTypeMedia } from "@/types";

export interface PropertyRoomTypeMediaRow {
  propertyRoomTypeMediaId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyId: number;
  propertyRoomId: bigint | number;
  mediaTypeId: bigint | number;
  mediaCategoryId: bigint | number;
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
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  mediaType?: { name: string } | null;
  mediaCategory?: { name: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyRoomTypeMedia(row: PropertyRoomTypeMediaRow): PropertyRoomTypeMedia {
  return {
    id: String(row.propertyRoomTypeMediaId),
    propertyRoomTypeMediaKey: Number(row.propertyRoomTypeMediaId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyId: row.propertyId,
    propertyRoomId: Number(row.propertyRoomId),
    mediaTypeId: Number(row.mediaTypeId),
    mediaTypeName: row.mediaType?.name,
    mediaCategoryId: Number(row.mediaCategoryId),
    mediaCategoryName: row.mediaCategory?.name,
    mediaUrl: row.mediaUrl,
    thumbnailUrl: row.thumbnailUrl,
    fileName: row.fileName,
    fileType: row.fileType,
    altText: row.altText,
    caption: row.caption,
    displayOrder: row.displayOrder,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
