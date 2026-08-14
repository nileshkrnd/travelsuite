import type { PropertyContractSeasonPeriod } from "@/types";

export interface PropertyContractSeasonPeriodRow {
  propertyContractSeasonPeriodId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyContractId: bigint | number;
  propertySeasonId: bigint | number;
  fromDate: Date | string;
  toDate: Date | string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  propertyContract?: {
    contractNumber: string;
    contractName: string;
    propertyId: number;
    property?: { propertyName: string | null; propertyCode: string } | null;
  } | null;
  propertySeason?: { seasonCode: string; seasonName: string } | null;
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

export function toAppPropertyContractSeasonPeriod(
  row: PropertyContractSeasonPeriodRow
): PropertyContractSeasonPeriod {
  return {
    id: String(row.propertyContractSeasonPeriodId),
    propertyContractSeasonPeriodKey: Number(row.propertyContractSeasonPeriodId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: Number(row.propertyContractId),
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    propertyId: row.propertyContract?.propertyId,
    propertyName:
      row.propertyContract?.property?.propertyName ??
      row.propertyContract?.property?.propertyCode,
    propertySeasonId: Number(row.propertySeasonId),
    seasonCode: row.propertySeason?.seasonCode,
    seasonName: row.propertySeason?.seasonName,
    fromDate: toDateOnly(row.fromDate) ?? "",
    toDate: toDateOnly(row.toDate) ?? "",
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
