export type ApplicableTo = "PROPERTY" | "ROOM" | "BOTH";

/** Amenity/Facility Category lookup — global (Property Facilities, Room Amenities, …). */
export interface AmenityFacilityCategory {
  id: string;
  categoryKey: number;
  code: string;
  name: string;
  applicableTo: ApplicableTo;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
