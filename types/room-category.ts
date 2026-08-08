/** Room Category master — Standard, Superior, Deluxe, Executive, Suite, Villa, … Global. */
export interface RoomCategory {
  id: string;
  roomCategoryKey: number;
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
