/** A sellable option within a Service Product (e.g. Standard / Premium / Private Safari). */
export interface ServiceProductOption {
  serviceProductOptionId: number;
  serviceProductId: number;
  productName?: string;
  optionCode: string;
  optionName: string;
  description: string | null;
  displayOrder: number;
  isDefault: boolean;
  isOnlineSellable: boolean;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
