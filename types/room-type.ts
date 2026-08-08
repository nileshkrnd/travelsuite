/** Room Type master — individual room types (Standard King Room, Deluxe Sea View Room, …), grouped under a Room Category. Global. */
export interface RoomType {
  id: string;
  roomTypeKey: number;
  roomCategoryKey: number;
  roomCategoryName?: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
