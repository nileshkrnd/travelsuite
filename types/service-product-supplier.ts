/** Links a Service Product to a Supplier that can fulfil/rate it. */
export interface ServiceProductSupplier {
  serviceProductSupplierId: number;
  serviceProductId: number;
  serviceProductName?: string;
  supplierId: number;
  supplierName?: string;
  supplierProductCode: string | null;
  isPrimary: boolean;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
