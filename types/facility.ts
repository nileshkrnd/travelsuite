/** Facility master — property-level facilities (Restaurant, Gym, Spa, Parking, …), grouped under a category. Global. */
export interface Facility {
  id: string;
  facilityKey: number;
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
