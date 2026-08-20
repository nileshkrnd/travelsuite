/** Inclusion/exclusion line-item type lookup — Transport, Meal, Ticket, Guide, … Global. Also reused as the Quantity unit on ServiceProductInclusionExclusion. */
export interface ServiceProductItemType {
  serviceProductItemTypeId: number;
  itemTypeCode: string;
  itemTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
