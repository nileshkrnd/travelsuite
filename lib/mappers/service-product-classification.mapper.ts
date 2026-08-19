import type { ServiceProductClassification } from "@/types";

export interface ServiceProductClassificationRow {
  serviceProductClassificationId: bigint | number;
  serviceTypeId: bigint | number;
  classificationCode: string;
  classificationName: string;
  parentClassificationId: bigint | number | null;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number;
  companyId: number;
  companyName?: string | null;
  serviceType?: { serviceTypeName: string } | null;
  parent?: { classificationName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductClassification(
  row: ServiceProductClassificationRow
): ServiceProductClassification {
  return {
    serviceProductClassificationId: Number(row.serviceProductClassificationId),
    serviceTypeId: Number(row.serviceTypeId),
    serviceTypeName: row.serviceType?.serviceTypeName ?? undefined,
    classificationCode: row.classificationCode,
    classificationName: row.classificationName,
    parentClassificationId: row.parentClassificationId != null ? Number(row.parentClassificationId) : null,
    parentClassificationName: row.parent?.classificationName ?? undefined,
    description: row.description,
    icon: row.icon,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    tenantId: row.tenantId,
    companyId: row.companyId,
    companyName: row.companyName ?? undefined,
  };
}
