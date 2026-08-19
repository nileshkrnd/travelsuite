import type { ServiceProductCategory } from "@/types";

export interface ServiceProductCategoryRow {
  serviceProductCategoryId: bigint | number;
  serviceTypeId: bigint | number;
  serviceProductClassificationId: bigint | number | null;
  parentServiceProductCategoryId: bigint | number | null;
  categoryCode: string;
  categoryName: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number;
  companyId: number;
  companyName?: string | null;
  serviceType?: { serviceTypeName: string } | null;
  classification?: { classificationName: string } | null;
  parent?: { categoryName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductCategory(row: ServiceProductCategoryRow): ServiceProductCategory {
  return {
    serviceProductCategoryId: Number(row.serviceProductCategoryId),
    serviceTypeId: Number(row.serviceTypeId),
    serviceTypeName: row.serviceType?.serviceTypeName ?? undefined,
    serviceProductClassificationId:
      row.serviceProductClassificationId != null ? Number(row.serviceProductClassificationId) : null,
    classificationName: row.classification?.classificationName ?? undefined,
    parentServiceProductCategoryId:
      row.parentServiceProductCategoryId != null ? Number(row.parentServiceProductCategoryId) : null,
    parentCategoryName: row.parent?.categoryName ?? undefined,
    categoryCode: row.categoryCode,
    categoryName: row.categoryName,
    description: row.description,
    icon: row.icon,
    imageUrl: row.imageUrl,
    displayOrder: row.displayOrder,
    isFeatured: row.isFeatured,
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
