import type { CashCustomer } from "@/types";

export interface CashCustomerRow {
  cashCustomerId: bigint | number;
  tenantId: number;
  companyId: number;
  cashCustomerCode: string;
  cashCustomerTypeId: bigint | number;
  customerName: string;
  firstName: string | null;
  lastName: string | null;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  email: string | null;
  countryId: number | null;
  nationalityId: number | null;
  currencyId: number;
  statusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  customerType?: { customerTypeName: string } | null;
  country?: { countryName: string } | null;
  nationality?: { countryName: string } | null;
  currency?: { currencyCode: string } | null;
  status?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppCashCustomer(row: CashCustomerRow): CashCustomer {
  return {
    cashCustomerId: Number(row.cashCustomerId),
    tenantId: row.tenantId,
    companyId: row.companyId,
    cashCustomerCode: row.cashCustomerCode,
    cashCustomerTypeId: Number(row.cashCustomerTypeId),
    customerTypeName: row.customerType?.customerTypeName ?? undefined,
    customerName: row.customerName,
    firstName: row.firstName,
    lastName: row.lastName,
    mobileCountryCode: row.mobileCountryCode,
    mobileNumber: row.mobileNumber,
    email: row.email,
    countryId: row.countryId,
    countryName: row.country?.countryName ?? undefined,
    nationalityId: row.nationalityId,
    nationalityName: row.nationality?.countryName ?? undefined,
    currencyId: row.currencyId,
    currencyCode: row.currency?.currencyCode ?? undefined,
    statusId: Number(row.statusId),
    statusName: row.status?.statusName ?? undefined,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
