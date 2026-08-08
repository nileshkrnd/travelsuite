/** View Type master — City, Sea, Pool, Garden, Beach, Mountain, Desert, Landmark View, … Global. */
export interface ViewType {
  id: string;
  viewTypeKey: number;
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
