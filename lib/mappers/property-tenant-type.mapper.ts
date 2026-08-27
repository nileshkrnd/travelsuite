import type { PropertyTenantType } from "@/types";

export interface PropertyTenantTypeRow {
  propertyTenantTypeId: bigint | number;
  tenantTypeCode: string;
  tenantTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyTenantType(row: PropertyTenantTypeRow): PropertyTenantType {
  return {
    propertyTenantTypeId: Number(row.propertyTenantTypeId),
    tenantTypeCode: row.tenantTypeCode,
    tenantTypeName: row.tenantTypeName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
