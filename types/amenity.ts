/** Amenity master — individual amenities/facilities (WiFi, TV, Mini Bar, …), grouped under a category. Global. */
export interface Amenity {
  id: string;
  amenityKey: number;
  categoryKey: number;
  categoryName?: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isFilterable: boolean;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
