/** Smoking Type master — Non Smoking, Smoking Allowed, Balcony Smoking, … Global. */
export interface SmokingType {
  id: string;
  smokingTypeKey: number;
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
