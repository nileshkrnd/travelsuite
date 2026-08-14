/** Media Type lookup — Image, Video, Virtual Tour, … Global. */
export interface MediaType {
  id: string;
  mediaTypeKey: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
