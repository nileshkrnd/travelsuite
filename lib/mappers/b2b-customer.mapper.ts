import type { B2BCustomer } from "@/types";

export interface B2BCustomerRow {
  b2bCustomerId: bigint | number;
  tenantId: number;
  companyId: number;
  b2bCustomerCode: string;
  b2bCustomerName: string;
  b2bCustomerTypeId: bigint | number;
  b2bCustomerCategoryId: bigint | number | null;
  parentB2bCustomerId: bigint | number | null;
  registrationNumber: string | null;
  taxRegistrationNumber: string | null;
  countryId: number;
  currencyId: number;
  paymentTermId: bigint | number | null;
  creditLimit: { toString(): string } | number | string | null;
  creditDays: number | null;
  accountManagerId: number | null;
  statusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  customerType?: { customerTypeName: string } | null;
  category?: { categoryName: string } | null;
  parent?: { b2bCustomerName: string } | null;
  country?: { countryName: string } | null;
  currency?: { currencyCode: string } | null;
  paymentTerm?: { paymentTermName: string } | null;
  accountManager?: { firstName: string; lastName: string } | null;
  status?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppB2BCustomer(row: B2BCustomerRow): B2BCustomer {
  return {
    b2bCustomerId: Number(row.b2bCustomerId),
    tenantId: row.tenantId,
    companyId: row.companyId,
    b2bCustomerCode: row.b2bCustomerCode,
    b2bCustomerName: row.b2bCustomerName,
    b2bCustomerTypeId: Number(row.b2bCustomerTypeId),
    customerTypeName: row.customerType?.customerTypeName ?? undefined,
    b2bCustomerCategoryId: row.b2bCustomerCategoryId != null ? Number(row.b2bCustomerCategoryId) : null,
    categoryName: row.category?.categoryName ?? undefined,
    parentB2bCustomerId: row.parentB2bCustomerId != null ? Number(row.parentB2bCustomerId) : null,
    parentB2bCustomerName: row.parent?.b2bCustomerName ?? undefined,
    registrationNumber: row.registrationNumber,
    taxRegistrationNumber: row.taxRegistrationNumber,
    countryId: row.countryId,
    countryName: row.country?.countryName ?? undefined,
    currencyId: row.currencyId,
    currencyCode: row.currency?.currencyCode ?? undefined,
    paymentTermId: row.paymentTermId != null ? Number(row.paymentTermId) : null,
    paymentTermName: row.paymentTerm?.paymentTermName ?? undefined,
    creditLimit: row.creditLimit != null ? Number(row.creditLimit.toString()) : null,
    creditDays: row.creditDays,
    accountManagerId: row.accountManagerId,
    accountManagerName: row.accountManager ? `${row.accountManager.firstName} ${row.accountManager.lastName}` : undefined,
    statusId: Number(row.statusId),
    statusName: row.status?.statusName ?? undefined,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
