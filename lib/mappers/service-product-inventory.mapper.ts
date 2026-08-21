import type { ServiceProductInventory, ServiceProductInventoryPeriod } from "@/types";

export interface ServiceProductInventoryPeriodRow {
  serviceProductInventoryPeriodId: bigint | number;
  fromDate: Date | string;
  toDate: Date | string;
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

export interface ServiceProductInventoryRow {
  serviceProductInventoryId: bigint | number;
  serviceProductId: bigint | number;
  serviceProductSupplierId: bigint | number | null;
  serviceProductOptionId: bigint | number | null;
  serviceProductVariantId: bigint | number | null;
  serviceProductScheduleId: bigint | number | null;
  inventoryTypeId: bigint | number;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  supplierLink?: { supplier: { supplierName: string } } | null;
  option?: { optionName: string } | null;
  variant?: { variantName: string } | null;
  inventoryType?: { inventoryTypeName: string } | null;
  periods?: ServiceProductInventoryPeriodRow[];
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function toAppPeriod(row: ServiceProductInventoryPeriodRow): ServiceProductInventoryPeriod {
  return {
    serviceProductInventoryPeriodId: Number(row.serviceProductInventoryPeriodId),
    fromDate: toDateOnly(row.fromDate) ?? "",
    toDate: toDateOnly(row.toDate) ?? "",
    isMonday: row.isMonday,
    isTuesday: row.isTuesday,
    isWednesday: row.isWednesday,
    isThursday: row.isThursday,
    isFriday: row.isFriday,
    isSaturday: row.isSaturday,
    isSunday: row.isSunday,
    allotmentQty: row.allotmentQty,
    releaseDays: row.releaseDays,
    isActive: row.isActive,
  };
}

export function toAppServiceProductInventory(row: ServiceProductInventoryRow): ServiceProductInventory {
  return {
    serviceProductInventoryId: Number(row.serviceProductInventoryId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    supplierName: row.supplierLink?.supplier.supplierName ?? undefined,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    optionName: row.option?.optionName ?? undefined,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    variantName: row.variant?.variantName ?? undefined,
    serviceProductScheduleId: row.serviceProductScheduleId != null ? Number(row.serviceProductScheduleId) : null,
    inventoryTypeId: Number(row.inventoryTypeId),
    inventoryTypeName: row.inventoryType?.inventoryTypeName ?? undefined,
    validFrom: toDateOnly(row.validFrom),
    validTo: toDateOnly(row.validTo),
    isActive: row.isActive,
    periods: (row.periods ?? []).map(toAppPeriod),
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
