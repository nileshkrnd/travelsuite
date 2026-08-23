import type { B2BCustomerType } from "@/types";

export interface B2BCustomerTypeRow {
  b2bCustomerTypeId: bigint | number;
  tenantId: number;
  companyId: number;
  customerTypeCode: string;
  customerTypeName: string;
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

export function toAppB2BCustomerType(row: B2BCustomerTypeRow): B2BCustomerType {
  return {
    b2bCustomerTypeId: Number(row.b2bCustomerTypeId),
    tenantId: row.tenantId,
    companyId: row.companyId,
    customerTypeCode: row.customerTypeCode,
    customerTypeName: row.customerTypeName,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
