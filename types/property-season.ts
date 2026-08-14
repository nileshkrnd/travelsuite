/** Property-level season definition (Low / High / Peak, …). */
export interface PropertySeason {
  id: string;
  propertySeasonKey: number;
  tenantKey: number;
  companyKey: number;
  propertyId: number;
  propertyName?: string;
  propertyCode?: string;
  seasonCode: string;
  seasonName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
