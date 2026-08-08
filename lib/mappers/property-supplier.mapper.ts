import type { PropertySupplier } from "@/types";

export interface PropertySupplierRow {
  propertySupplierId: bigint | number;
  propertyId: number;
  supplierId: bigint | number;
  isPrimary: boolean;
  isActive: boolean;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  createdBy: number;
  createdDtTm: Date | string;
  property?: { propertyCode: string; propertyName: string | null } | null;
  supplier?: { supplierCode: string; supplierName: string } | null;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function toAppPropertySupplier(row: PropertySupplierRow): PropertySupplier {
  return {
    id: String(row.propertySupplierId),
    propertySupplierKey: Number(row.propertySupplierId),
    propertyId: row.propertyId,
    propertyCode: row.property?.propertyCode,
    propertyName: row.property?.propertyName ?? undefined,
    supplierId: Number(row.supplierId),
    supplierCode: row.supplier?.supplierCode,
    supplierName: row.supplier?.supplierName,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    validFrom: toDateOnly(row.validFrom),
    validTo: toDateOnly(row.validTo),
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm),
  };
}
