import type { SupplierPropertyAccess } from "@/types";

export interface SupplierPropertyAccessRow {
  supplierPropertyAccessId: bigint | number;
  tenantId: number;
  companyId: number;
  propertySupplierId: bigint | number;
  userId: number;
  canView: boolean;
  canCreateRate: boolean;
  canEditRate: boolean;
  canSubmitRate: boolean;
  canApproveRate: boolean;
  isActive: boolean;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  createdBy: number;
  createdDtTm: Date | string;
  propertySupplier?: {
    property?: { propertyName: string | null; propertyCode: string } | null;
    supplier?: { supplierName: string } | null;
  } | null;
  user?: { userDisplayName: string } | null;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function toAppSupplierPropertyAccess(row: SupplierPropertyAccessRow): SupplierPropertyAccess {
  return {
    id: String(row.supplierPropertyAccessId),
    supplierPropertyAccessKey: Number(row.supplierPropertyAccessId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertySupplierId: Number(row.propertySupplierId),
    propertyName: row.propertySupplier?.property?.propertyName ?? row.propertySupplier?.property?.propertyCode,
    supplierName: row.propertySupplier?.supplier?.supplierName,
    userKey: row.userId,
    userName: row.user?.userDisplayName,
    canView: row.canView,
    canCreateRate: row.canCreateRate,
    canEditRate: row.canEditRate,
    canSubmitRate: row.canSubmitRate,
    canApproveRate: row.canApproveRate,
    isActive: row.isActive,
    validFrom: toDateOnly(row.validFrom),
    validTo: toDateOnly(row.validTo),
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm),
  };
}
