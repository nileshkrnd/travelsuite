import type { IdentityDocumentType } from "@/types";

export interface IdentityDocumentTypeRow {
  identityDocumentTypeId: bigint | number;
  documentTypeCode: string;
  documentTypeName: string;
  description: string | null;
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

export function toAppIdentityDocumentType(row: IdentityDocumentTypeRow): IdentityDocumentType {
  return {
    identityDocumentTypeId: Number(row.identityDocumentTypeId),
    documentTypeCode: row.documentTypeCode,
    documentTypeName: row.documentTypeName,
    description: row.description,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
