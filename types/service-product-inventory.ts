/** Date-range allotment period within a Service Product inventory header. */
export interface ServiceProductInventoryPeriod {
  serviceProductInventoryPeriodId: number;
  fromDate: string;
  toDate: string;
  isMonday: boolean;
  isTuesday: boolean;
  isWednesday: boolean;
  isThursday: boolean;
  isFriday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  allotmentQty: number;
  releaseDays: number;
  isActive: boolean;
}

/** Inventory/allotment header for a Service Product — optionally scoped to a supplier, option, variant, or schedule. */
export interface ServiceProductInventory {
  serviceProductInventoryId: number;
  serviceProductId: number;
  serviceProductName?: string;
  serviceProductSupplierId: number | null;
  supplierName?: string;
  serviceProductOptionId: number | null;
  optionName?: string;
  serviceProductVariantId: number | null;
  variantName?: string;
  serviceProductScheduleId: number | null;
  inventoryTypeId: number;
  inventoryTypeName?: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  periods: ServiceProductInventoryPeriod[];
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
