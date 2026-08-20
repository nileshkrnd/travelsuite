import type { ServiceProductSupplier } from "@/types";

export interface ServiceProductSupplierRow {
  serviceProductSupplierId: bigint | number;
  serviceProductId: bigint | number;
  supplierId: bigint | number;
  supplierProductCode: string | null;
  isPrimary: boolean;
  isActive: boolean;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  serviceProduct?: { serviceProductName: string } | null;
  supplier?: { supplierName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function toAppServiceProductSupplier(row: ServiceProductSupplierRow): ServiceProductSupplier {
  return {
    serviceProductSupplierId: Number(row.serviceProductSupplierId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductName: row.serviceProduct?.serviceProductName ?? undefined,
    supplierId: Number(row.supplierId),
    supplierName: row.supplier?.supplierName ?? undefined,
    supplierProductCode: row.supplierProductCode,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    validFrom: toDateOnly(row.validFrom),
    validTo: toDateOnly(row.validTo),
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
