/** INCLUSION / EXCLUSION type lookup. Global. */
export interface InclusionExclusionType {
  inclusionExclusionTypeId: number;
  typeCode: string;
  typeName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
