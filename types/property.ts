/** Shape shared by all global name-only lookup masters (Property Type/Category/Usage, Ownership Type, Property Brand). */
export interface GlobalNameLookup {
  id: string;
  key: number;
  name: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}

/** Property Type lookup — global (Hotel, Apartment, Villa, …). */
export type PropertyType = GlobalNameLookup;

/** Property Category lookup — global (Luxury, Budget, Midscale, …). */
export type PropertyCategory = GlobalNameLookup;

/** Property Usage lookup — global (Rental, Owned, Leasing). */
export type PropertyUsage = GlobalNameLookup;

/** Ownership Type lookup — global (Company Owned, Third Party). */
export type OwnershipType = GlobalNameLookup;

/** Property Brand lookup — global (Hilton, Accor, Marriott, …). */
export type PropertyBrand = GlobalNameLookup;

/** Shape shared by global code+name lookup masters (Floor Type, Unit Type, Unit Status, …). */
export interface GlobalCodeLookup {
  id: string;
  key: number;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  /** Present on Contact Type. CUSTOMER | SUPPLIER | BOTH */
  contactTypeCategory?: string;
}

export type FloorType = GlobalCodeLookup;
export type UnitType = GlobalCodeLookup;
export type UnitCategory = GlobalCodeLookup;
export type UnitStatus = GlobalCodeLookup;
export type FurnishedStatus = GlobalCodeLookup;

/** Property master — global. TenantID/CompanyID = null means a globally-managed property (Super Admin); a real value means a property a tenant registered for itself. */
export interface Property {
  propertyId: number;
  tenantId: number | null;
  companyId: number | null;
  propertyCode: string;
  propertyName: string | null;
  propertyDisplayName: string | null;
  shortDescription: string | null;
  description: string | null;
  internalRemarks: string | null;
  propertyTypeIds: number[];
  propertyCategoryIds: number[];
  propertyUsageId: number | null;
  ownershipTypeId: number | null;
  propertyBrandId: number | null;
  supplierId: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  buildingName: string | null;
  buildingNumber: string | null;
  streetName: string | null;
  streetNumber: string | null;
  zoneNumber: string | null;
  countryId: number;
  stateId: number | null;
  cityId: number | null;
  areaId: number | null;
  locationId: number | null;
  postalCode: string | null;
  poBox: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  googleMapUrl: string | null;
  plusCode: string | null;
  timeZoneId: number | null;
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
  propertyTypeNames: string[];
  propertyCategoryNames: string[];
  propertyUsageName?: string;
  ownershipTypeName?: string;
  propertyBrandName?: string;
  countryName?: string;
  cityName?: string;
  coverImageUrl?: string | null;
}
