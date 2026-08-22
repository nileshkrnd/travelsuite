/** Core sellable product catalog entry — a Transfer/Tour/Activity/etc. product, classified and optionally categorized. */
export interface ServiceProduct {
  serviceProductId: number;
  serviceProductCode: string;
  serviceProductName: string;
  /** URL-safe slug for the public catalog page, e.g. "doha-desert-safari". */
  slug: string | null;
  serviceTypeId: number;
  serviceTypeName?: string;
  serviceProductClassificationId: number;
  classificationName?: string;
  serviceProductCategoryId: number | null;
  categoryName?: string;
  supplierId: number | null;
  supplierName?: string;
  countryId: number | null;
  countryName?: string;
  regionId: number | null;
  regionName?: string;
  cityId: number | null;
  cityName?: string;
  shortDescription: string | null;
  description: string | null;
  isOnlineSellable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  commonStatusId: number;
  statusName?: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
  companyName?: string;
}
