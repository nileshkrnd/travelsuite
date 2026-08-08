/** Property ↔ Supplier link — which supplier(s) service a property, with one optional primary supplier. */
export interface PropertySupplier {
  id: string;
  propertySupplierKey: number;
  propertyId: number;
  propertyCode?: string;
  propertyName?: string;
  supplierId: number;
  supplierCode?: string;
  supplierName?: string;
  isPrimary: boolean;
  isActive: boolean;
  /** YYYY-MM-DD */
  validFrom: string | null;
  /** YYYY-MM-DD */
  validTo: string | null;
  createdBy: number;
  createdAt: string;
}
