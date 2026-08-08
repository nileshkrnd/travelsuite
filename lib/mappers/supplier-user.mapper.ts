import type { SupplierUser } from "@/types";

export interface SupplierUserRow {
  supplierUserId: bigint | number;
  supplierId: bigint | number;
  firstName: string;
  lastName: string;
  email: string;
  dialCountryCode: string | null;
  mobileNumber: string | null;
  accessRoleId: number;
  userId: number;
  isActive: boolean;
  createdDate: Date | string;
  createdBy: number;
  updatedDate: Date | string | null;
  updatedBy: number | null;
  supplier?: { supplierName: string } | null;
  accessRole?: { accessRoleName: string } | null;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppSupplierUser(row: SupplierUserRow): SupplierUser {
  return {
    id: String(row.supplierUserId),
    supplierUserKey: Number(row.supplierUserId),
    supplierId: Number(row.supplierId),
    supplierName: row.supplier?.supplierName,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    dialCountryCode: row.dialCountryCode,
    mobileNumber: row.mobileNumber,
    accessRoleId: row.accessRoleId,
    accessRoleName: row.accessRole?.accessRoleName,
    userKey: row.userId,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDate),
    updatedBy: row.updatedBy,
    updatedAt: row.updatedDate == null ? null : toIso(row.updatedDate),
  };
}
