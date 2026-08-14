/** Room size unit master — SQM, SQFT, … Global. */
export interface RoomSizeUnit {
  id: string;
  roomSizeUnitKey: number;
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
