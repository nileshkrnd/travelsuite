/** Bed Type master — Single, Twin, Double, Queen, King, Sofa Bed, … Global. */
export interface BedType {
  id: string;
  bedTypeKey: number;
  code: string;
  name: string;
  bedSize: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
