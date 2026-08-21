/** Tax assignment for a Service Product — optionally scoped to a supplier, option, or variant. */
export interface ServiceProductTax {
  serviceProductTaxId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductSupplierId: number | null;
  supplierName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  taxId: number;
  taxCode?: string;
  taxName: string;
  taxCalculationTypeId: number;
  taxCalculationTypeCode?: string;
  taxCalculationTypeName?: string;
  taxRate: number | null;
  taxAmount: number | null;
  taxApplicationBasisId: number;
  taxApplicationBasisCode?: string;
  taxApplicationBasisName?: string;
  isInclusive: boolean;
  isCompound: boolean;
  sequenceNo: number;
  fromDate: string;
  toDate: string | null;
  isActive: boolean;
  remarks: string | null;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
