/** A sellable variant within a Service Product Option (e.g. Sedan / SUV / Van under Private Transfer). */
export interface ServiceProductVariant {
  serviceProductVariantId: number;
  serviceProductOptionId: number;
  optionName?: string;
  variantCode: string;
  variantName: string;
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
