/** Duration unit master — Minute, Hour, Day, Night, Week, Month. */
export interface DurationUnit {
  durationUnitId: number;
  durationUnitCode: string;
  durationUnitName: string;
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
