/** What's included / excluded in a Service Product — item, optional quantity + unit, mandatory flag. */
export interface ServiceProductInclusionExclusion {
  serviceProductInclusionExclusionId: number;
  serviceProductId: number;
  serviceProductName?: string;
  inclusionExclusionTypeId: number;
  inclusionExclusionTypeName?: string;
  itemTypeId: number | null;
  itemTypeName?: string;
  itemName: string;
  description: string | null;
  quantity: number | null;
  unitId: number | null;
  unitName?: string;
  isMandatory: boolean;
  displayOrder: number;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
