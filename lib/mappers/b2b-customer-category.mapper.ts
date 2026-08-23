import type { B2BCustomerCategory } from "@/types";

export interface B2BCustomerCategoryRow {
  b2bCustomerCategoryId: bigint | number;
  tenantId: number;
  companyId: number;
  b2bCustomerTypeId: bigint | number;
  categoryCode: string;
  categoryName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  customerType?: { customerTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppB2BCustomerCategory(row: B2BCustomerCategoryRow): B2BCustomerCategory {
  return {
    b2bCustomerCategoryId: Number(row.b2bCustomerCategoryId),
    tenantId: row.tenantId,
    companyId: row.companyId,
    b2bCustomerTypeId: Number(row.b2bCustomerTypeId),
    customerTypeName: row.customerType?.customerTypeName ?? undefined,
    categoryCode: row.categoryCode,
    categoryName: row.categoryName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
