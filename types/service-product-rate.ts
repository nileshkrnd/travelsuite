/** One day-of-week toggle for which days a Service Product Rate applies. */
export interface ServiceProductRateDay {
  dayOfWeekId: number;
  dayOfWeekName?: string;
  isActive: boolean;
}

/** A supplier's rate for a Service Product by Rate Type, optionally scoped to an Option/Variant/Schedule and a pax/quantity slab. */
export interface ServiceProductRate {
  serviceProductRateId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductSupplierId: number;
  supplierName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  serviceProductScheduleId: number | null;
  rateTypeId: number;
  rateTypeName?: string;
  minimumPax: number | null;
  maximumPax: number | null;
  minimumQuantity: number | null;
  maximumQuantity: number | null;
  rateAmount: number;
  validFrom: string | null;
  validTo: string | null;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  days: ServiceProductRateDay[];
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
