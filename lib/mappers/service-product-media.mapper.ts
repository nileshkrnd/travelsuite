import type { ServiceProductMedia } from "@/types";

export interface ServiceProductMediaRow {
  serviceProductMediaId: bigint | number;
  serviceProductId: bigint | number;
  mediaTypeId: bigint | number;
  mediaCategoryId: bigint | number;
  mediaUrl: string;
  thumbnailUrl: string | null;
  mediaTitle: string | null;
  mediaDescription: string | null;
  altText: string | null;
  fileName: string | null;
  fileExtension: string | null;
  mimeType: string | null;
  fileSize: bigint | number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  isPrimary: boolean;
  displayOrder: number;
  commonStatusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  mediaType?: { name: string } | null;
  mediaCategory?: { name: string } | null;
  commonStatus?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductMedia(row: ServiceProductMediaRow): ServiceProductMedia {
  return {
    serviceProductMediaId: Number(row.serviceProductMediaId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    mediaTypeId: Number(row.mediaTypeId),
    mediaTypeName: row.mediaType?.name ?? undefined,
    mediaCategoryId: Number(row.mediaCategoryId),
    mediaCategoryName: row.mediaCategory?.name ?? undefined,
    mediaUrl: row.mediaUrl,
    thumbnailUrl: row.thumbnailUrl,
    mediaTitle: row.mediaTitle,
    mediaDescription: row.mediaDescription,
    altText: row.altText,
    fileName: row.fileName,
    fileExtension: row.fileExtension,
    mimeType: row.mimeType,
    fileSize: row.fileSize != null ? Number(row.fileSize) : null,
    width: row.width,
    height: row.height,
    durationSeconds: row.durationSeconds,
    isPrimary: row.isPrimary,
    displayOrder: row.displayOrder,
    commonStatusId: Number(row.commonStatusId),
    statusName: row.commonStatus?.statusName ?? undefined,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
