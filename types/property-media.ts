export type PropertyMediaKind = "image" | "video";

/** Property media (photos/videos) — attached to a Property. One row per property may be the cover. */
export interface PropertyMedia {
  id: string;
  propertyMediaKey: number;
  propertyKey: number;
  mediaType: PropertyMediaKind;
  imageType: string;
  url: string;
  fileName: string | null;
  description: string | null;
  isCover: boolean;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
