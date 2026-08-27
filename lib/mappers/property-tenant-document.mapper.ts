import type { PropertyTenantDocument } from "@/types";

export interface PropertyTenantDocumentRow {
  propertyTenantDocumentId: bigint | number;
  propertyTenantId: bigint | number;
  identityDocumentCountryId: bigint | number;
  documentNumber: string;
  issueDate: Date | string | null;
  expiryDate: Date | string | null;
  documentFileUrl: string | null;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedDtTm: Date | string | null;
  verifiedBy: number | null;
  statusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  identityDocumentCountry?: { documentDisplayName: string; documentShortName: string | null } | null;
  status?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function toAppPropertyTenantDocument(row: PropertyTenantDocumentRow): PropertyTenantDocument {
  return {
    propertyTenantDocumentId: Number(row.propertyTenantDocumentId),
    propertyTenantId: Number(row.propertyTenantId),
    identityDocumentCountryId: Number(row.identityDocumentCountryId),
    documentDisplayName: row.identityDocumentCountry?.documentDisplayName ?? undefined,
    documentShortName: row.identityDocumentCountry?.documentShortName ?? undefined,
    documentNumber: row.documentNumber,
    issueDate: toDateOnly(row.issueDate),
    expiryDate: toDateOnly(row.expiryDate),
    documentFileUrl: row.documentFileUrl,
    isPrimary: row.isPrimary,
    isVerified: row.isVerified,
    verifiedDtTm: toIso(row.verifiedDtTm),
    verifiedBy: row.verifiedBy,
    statusId: Number(row.statusId),
    statusName: row.status?.statusName ?? undefined,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
