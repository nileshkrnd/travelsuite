import type { IdentityDocumentCountry } from "@/types";

export interface IdentityDocumentCountryRow {
  identityDocumentCountryId: bigint | number;
  identityDocumentTypeId: bigint | number;
  countryId: number;
  documentDisplayName: string;
  documentShortName: string | null;
  issuingAuthority: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  documentType?: { documentTypeName: string } | null;
  country?: { countryName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppIdentityDocumentCountry(row: IdentityDocumentCountryRow): IdentityDocumentCountry {
  return {
    identityDocumentCountryId: Number(row.identityDocumentCountryId),
    identityDocumentTypeId: Number(row.identityDocumentTypeId),
    documentTypeName: row.documentType?.documentTypeName ?? undefined,
    countryId: row.countryId,
    countryName: row.country?.countryName ?? undefined,
    documentDisplayName: row.documentDisplayName,
    documentShortName: row.documentShortName,
    issuingAuthority: row.issuingAuthority,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
