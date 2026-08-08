import type { PropertyMedia, PropertyMediaKind } from "@/types";

export interface PropertyMediaRow {
  propertyMediaId: number;
  propertyId: number;
  mediaType: string;
  imageType: string;
  mediaUrl: string;
  fileName: string | null;
  description: string | null;
  isCover: boolean;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyMedia(row: PropertyMediaRow): PropertyMedia {
  return {
    id: String(row.propertyMediaId),
    propertyMediaKey: row.propertyMediaId,
    propertyKey: row.propertyId,
    mediaType: row.mediaType === "video" ? "video" : ("image" as PropertyMediaKind),
    imageType: row.imageType,
    url: row.mediaUrl,
    fileName: row.fileName,
    description: row.description,
    isCover: row.isCover,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
