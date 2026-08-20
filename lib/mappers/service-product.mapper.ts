import type { ServiceProduct } from "@/types";

export interface ServiceProductRow {
  serviceProductId: bigint | number;
  serviceProductCode: string;
  serviceProductName: string;
  serviceTypeId: bigint | number;
  serviceProductClassificationId: bigint | number;
  serviceProductCategoryId: bigint | number | null;
  supplierId: bigint | number | null;
  countryId: number | null;
  regionId: number | null;
  cityId: number | null;
  shortDescription: string | null;
  description: string | null;
  isOnlineSellable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  commonStatusId: bigint | number;
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
  category?: { categoryName: string } | null;
  supplier?: { supplierName: string } | null;
  country?: { countryName: string } | null;
  region?: { regionName: string } | null;
  city?: { cityName: string } | null;
  commonStatus?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProduct(row: ServiceProductRow): ServiceProduct {
  return {
    serviceProductId: Number(row.serviceProductId),
    serviceProductCode: row.serviceProductCode,
    serviceProductName: row.serviceProductName,
    serviceTypeId: Number(row.serviceTypeId),
    serviceTypeName: row.serviceType?.serviceTypeName ?? undefined,
    serviceProductClassificationId: Number(row.serviceProductClassificationId),
    classificationName: row.classification?.classificationName ?? undefined,
    serviceProductCategoryId: row.serviceProductCategoryId != null ? Number(row.serviceProductCategoryId) : null,
    categoryName: row.category?.categoryName ?? undefined,
    supplierId: row.supplierId != null ? Number(row.supplierId) : null,
    supplierName: row.supplier?.supplierName ?? undefined,
    countryId: row.countryId,
    countryName: row.country?.countryName ?? undefined,
    regionId: row.regionId,
    regionName: row.region?.regionName ?? undefined,
    cityId: row.cityId,
    cityName: row.city?.cityName ?? undefined,
    shortDescription: row.shortDescription,
    description: row.description,
    isOnlineSellable: row.isOnlineSellable,
    isFeatured: row.isFeatured,
    displayOrder: row.displayOrder,
    commonStatusId: Number(row.commonStatusId),
    statusName: row.commonStatus?.statusName ?? undefined,
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
