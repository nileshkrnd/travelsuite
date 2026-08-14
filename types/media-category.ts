/** Media Category lookup — Room, Bathroom, View, Bed, Amenities, … Global. */
export interface MediaCategory {
  id: string;
  mediaCategoryKey: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
