import type { PropertyContract } from "@/types";

export interface PropertyContractRow {
  propertyContractId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyId: number;
  supplierId: bigint | number;
  contractNumber: string;
  contractName: string;
  contractTypeId: bigint | number;
  startDate: Date | string;
  endDate: Date | string;
  contractCurrencyId: number;
  contractStatusId: bigint | number;
  contractVersion: number;
  signedDate: Date | string | null;
  signedByEmployeeId: number | null;
  supplierContactId: bigint | number | null;
  paymentTerms: string | null;
  generalTerms: string | null;
  remarks: string | null;
  contractFileUrl: string | null;
  contractFileName: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  property?: {
    propertyName: string | null;
    propertyCode: string;
    country?: { countryName: string } | null;
    city?: { cityName: string } | null;
  } | null;
  supplier?: { supplierName: string } | null;
  contractType?: { name: string } | null;
  contractStatus?: { name: string } | null;
  currency?: { currencyCode: string } | null;
  signedByEmployee?: { title: string; firstName: string; lastName: string } | null;
  supplierContact?: { firstName: string; lastName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function toAppPropertyContract(row: PropertyContractRow): PropertyContract {
  return {
    id: String(row.propertyContractId),
    propertyContractKey: Number(row.propertyContractId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyId: row.propertyId,
    propertyName: row.property?.propertyName ?? row.property?.propertyCode,
    propertyCode: row.property?.propertyCode,
    countryName: row.property?.country?.countryName,
    cityName: row.property?.city?.cityName,
    supplierId: Number(row.supplierId),
    supplierName: row.supplier?.supplierName,
    contractNumber: row.contractNumber,
    contractName: row.contractName,
    contractTypeId: Number(row.contractTypeId),
    contractTypeName: row.contractType?.name,
    startDate: toDateOnly(row.startDate) ?? "",
    endDate: toDateOnly(row.endDate) ?? "",
    contractCurrencyId: row.contractCurrencyId,
    contractCurrencyCode: row.currency?.currencyCode,
    contractStatusId: Number(row.contractStatusId),
    contractStatusName: row.contractStatus?.name,
    contractVersion: row.contractVersion,
    signedDate: toDateOnly(row.signedDate),
    signedByEmployeeId: row.signedByEmployeeId,
    signedByEmployeeName: row.signedByEmployee
      ? `${row.signedByEmployee.title} ${row.signedByEmployee.firstName} ${row.signedByEmployee.lastName}`
          .replace(/\s+/g, " ")
          .trim()
      : undefined,
    supplierContactId: row.supplierContactId == null ? null : Number(row.supplierContactId),
    supplierContactName: row.supplierContact
      ? `${row.supplierContact.firstName} ${row.supplierContact.lastName}`.trim()
      : undefined,
    paymentTerms: row.paymentTerms,
    generalTerms: row.generalTerms,
    remarks: row.remarks,
    contractFileUrl: row.contractFileUrl,
    contractFileName: row.contractFileName,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
