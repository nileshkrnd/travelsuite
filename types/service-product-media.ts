/** Media (photos/videos/PDFs) for a Service Product — Cover, Gallery, Map, Location, … */
export interface ServiceProductMedia {
  serviceProductMediaId: number;
  serviceProductId: number;
  serviceProductName?: string;
  mediaTypeId: number;
  mediaTypeName?: string;
  mediaCategoryId: number;
  mediaCategoryName?: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  mediaTitle: string | null;
  mediaDescription: string | null;
  altText: string | null;
  fileName: string | null;
  fileExtension: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  isPrimary: boolean;
  displayOrder: number;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
