import type { PropertySupplier, SupplierPropertyGrant } from "@/types";

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

/** Groups the flat per-row rows (one row per property) into one grant per supplier. */
export function toAppSupplierPropertyGrants(rows: PropertySupplierRow[]): SupplierPropertyGrant[] {
  const bySupplier = new Map<number, PropertySupplierRow[]>();
  for (const row of rows) {
    const supplierId = Number(row.supplierId);
    const list = bySupplier.get(supplierId);
    if (list) list.push(row);
    else bySupplier.set(supplierId, [row]);
  }

  return [...bySupplier.entries()].map(([supplierId, group]) => {
    const first = group[0]!;
    return {
      supplierId,
      supplierName: first.supplier?.supplierName,
      properties: group.map((r) => ({
        propertyId: r.propertyId,
        propertyCode: r.property?.propertyCode,
        propertyName: r.property?.propertyName ?? undefined,
      })),
      isPrimary: group.some((r) => r.isPrimary),
      isActive: first.isActive,
      validFrom: toDateOnly(first.validFrom),
      validTo: toDateOnly(first.validTo),
      createdBy: first.createdBy,
      createdAt: toIso(first.createdDtTm),
    };
  });
}
