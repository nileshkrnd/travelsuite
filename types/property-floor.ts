export interface PropertyFloor {
  propertyFloorId: number;
  propertyId: number;
  floorCode: string;
  floorNumber: number;
  floorName: string;
  floorTypeId: number;
  displayOrder: number;
  totalUnits: number | null;
  occupiedUnits: number | null;
  availableUnits: number | null;
  floorArea: number | null;
  areaUnitId: number | null;
  description: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  propertyCode?: string | null;
  propertyName?: string | null;
  floorTypeName?: string | null;
  areaUnitName?: string | null;
}
