/** Category / sub-category under a Service Type (optionally within a Classification) — self-referencing for a hierarchy (e.g. Hotel > Beach Resort > Overwater Villas). */
export interface ServiceProductCategory {
  serviceProductCategoryId: number;
  serviceTypeId: number;
  serviceTypeName?: string;
  serviceProductClassificationId: number | null;
  classificationName?: string;
  parentServiceProductCategoryId: number | null;
  parentCategoryName?: string;
  categoryCode: string;
  categoryName: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
  companyName?: string;
}
