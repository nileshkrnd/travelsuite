/** Rate type group master — Passenger, Unit, Vehicle, Group, Room, Application. */
export interface RateTypeGroup {
  rateTypeGroupId: number;
  rateTypeGroupCode: string;
  rateTypeGroupName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string;
}
