/** Property master — scoped by TenantID + CompanyID. */
export interface Property {
  propertyId: number;
  tenantId: number;
  companyId: number;
  propertyCode: string;
  propertyTypeId: number;
  propertyCategoryId: number | null;
  propertyUsageId: number | null;
  ownershipTypeId: number | null;
  propertyBrandId: number | null;
  supplierId: number | null;
  /** YYYY-MM-DD */
  openingDate: string | null;
  /** YYYY-MM-DD */
  closingDate: string | null;
  rating: number | null;
  starRating: number | null;
  isFeatured: boolean;
  isPublished: boolean;
  isActive: boolean;
  createdBy: number | null;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  companyName?: string;
  propertyTypeName?: string;
  propertyCategoryName?: string;
  propertyUsageName?: string;
  ownershipTypeName?: string;
  propertyBrandName?: string;
}
