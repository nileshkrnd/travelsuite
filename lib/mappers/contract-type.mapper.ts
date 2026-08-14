import type { ContractType } from "@/types";

export interface ContractTypeRow {
  contractTypeId: number;
  name: string;
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

export function toAppContractType(row: ContractTypeRow): ContractType {
  return {
    id: String(row.contractTypeId),
    contractTypeKey: row.contractTypeId,
    name: row.name,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
