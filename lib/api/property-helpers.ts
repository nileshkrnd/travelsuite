import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalPositiveInt = z
  .union([z.number().int().positive(), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null || v === "" ? null : v));

const optionalLatitude = z
  .union([z.number().min(-90).max(90), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

const optionalLongitude = z
  .union([z.number().min(-180).max(180), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

export const propertyWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    propertyCode: z.string().trim().min(1).max(50),
    propertyName: optionalText(250),
    propertyDisplayName: optionalText(250),
    shortDescription: optionalText(20000),
    description: optionalText(20000),
    internalRemarks: optionalText(20000),
    propertyTypeIds: z.array(z.number().int().positive()).min(1, "Select at least one property type"),
    propertyCategoryIds: z.array(z.number().int().positive()).optional().default([]),
    propertyUsageId: optionalPositiveInt,
    ownershipTypeId: optionalPositiveInt,
    propertyBrandId: optionalPositiveInt,
    supplierId: optionalPositiveInt,
    addressLine1: optionalText(255),
    addressLine2: optionalText(255),
    buildingName: optionalText(150),
    buildingNumber: optionalText(50),
    streetName: optionalText(150),
    streetNumber: optionalText(20),
    zoneNumber: optionalText(20),
    countryId: z.number().int().positive("Country is required"),
    stateId: optionalPositiveInt,
    cityId: optionalPositiveInt,
    areaId: optionalPositiveInt,
    locationId: optionalPositiveInt,
    postalCode: optionalText(20),
    poBox: optionalText(50),
    landmark: optionalText(255),
    latitude: optionalLatitude,
    longitude: optionalLongitude,
    googlePlaceId: optionalText(255),
    googleMapUrl: optionalText(20000),
    plusCode: optionalText(50),
    timeZoneId: optionalPositiveInt,
    openingDate: optionalDate,
    closingDate: optionalDate,
    rating: z
      .union([z.number().min(0).max(9.99), z.null()])
      .optional()
      .transform((v) => (v === undefined ? undefined : v)),
    starRating: z
      .union([z.number().int().min(0).max(7), z.null()])
      .optional()
      .transform((v) => (v === undefined ? undefined : v)),
    isFeatured: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.openingDate && values.closingDate && values.closingDate < values.openingDate) {
      ctx.addIssue({
        code: "custom",
        path: ["closingDate"],
        message: "Closing date must be on or after opening date",
      });
    }
  });

export const propertyInclude = {
  typeLinks: {
    include: { propertyType: { select: { propertyTypeName: true } } },
  },
  categoryLinks: {
    include: { propertyCategory: { select: { propertyCategoryName: true } } },
  },
  propertyUsage: { select: { propertyUsageName: true } },
  ownershipType: { select: { ownershipTypeName: true } },
  propertyBrand: { select: { propertyBrandName: true } },
  country: { select: { countryName: true } },
  city: { select: { cityName: true } },
} as const;

type SerializableProperty = {
  propertyUsageId?: bigint | null;
  ownershipTypeId?: bigint | null;
  propertyBrandId?: bigint | null;
  typeLinks?: Array<{ propertyTypeId: bigint; [key: string]: unknown }>;
  categoryLinks?: Array<{ propertyCategoryId: bigint; [key: string]: unknown }>;
  [key: string]: unknown;
};

/** Property's BigInt lookup FKs can't pass through NextResponse.json() (JSON.stringify throws on bigint) — convert to number first. */
export function serializePropertyRow<T extends SerializableProperty>(row: T) {
  return {
    ...row,
    propertyUsageId: row.propertyUsageId != null ? Number(row.propertyUsageId) : null,
    ownershipTypeId: row.ownershipTypeId != null ? Number(row.ownershipTypeId) : null,
    propertyBrandId: row.propertyBrandId != null ? Number(row.propertyBrandId) : null,
    typeLinks: row.typeLinks?.map((l) => ({ ...l, propertyTypeId: Number(l.propertyTypeId) })),
    categoryLinks: row.categoryLinks?.map((l) => ({ ...l, propertyCategoryId: Number(l.propertyCategoryId) })),
  };
}

export async function withCompanyName<T extends { companyId: number }>(rows: T[]) {
  const companyIds = [...new Set(rows.map((r) => r.companyId))];
  if (companyIds.length === 0) return rows.map((r) => ({ ...r, companyName: null as string | null }));
  const companies = await prisma.company.findMany({
    where: { companyId: { in: companyIds } },
    select: { companyId: true, companyName: true },
  });
  const nameById = new Map(companies.map((c) => [c.companyId, c.companyName]));
  return rows.map((r) => ({ ...r, companyName: nameById.get(r.companyId) ?? null }));
}

function parseDateOnly(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function trimOrNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const t = value.trim();
  return t || null;
}

export async function validatePropertyLookups(data: {
  tenantId: number;
  companyId: number;
  propertyTypeIds: number[];
  propertyCategoryIds?: number[];
  propertyUsageId?: number | null;
  ownershipTypeId?: number | null;
  propertyBrandId?: number | null;
  countryId: number;
  cityId?: number | null;
}): Promise<NextResponse | null> {
  const company = await prisma.company.findFirst({
    where: { companyId: data.companyId, tenantId: data.tenantId },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
  }

  const uniqueTypeIds = [...new Set(data.propertyTypeIds)];
  if (uniqueTypeIds.length === 0) {
    return NextResponse.json({ error: "Select at least one property type" }, { status: 400 });
  }
  const types = await prisma.propertyType.findMany({
    where: { propertyTypeId: { in: uniqueTypeIds.map(BigInt) } },
  });
  if (types.length !== uniqueTypeIds.length) {
    return NextResponse.json({ error: "One or more property types were not found" }, { status: 400 });
  }

  const uniqueCategoryIds = [...new Set(data.propertyCategoryIds ?? [])];
  if (uniqueCategoryIds.length > 0) {
    const cats = await prisma.propertyCategory.findMany({
      where: { propertyCategoryId: { in: uniqueCategoryIds.map(BigInt) } },
    });
    if (cats.length !== uniqueCategoryIds.length) {
      return NextResponse.json({ error: "One or more property categories were not found" }, { status: 400 });
    }
  }

  if (data.propertyUsageId != null) {
    const row = await prisma.propertyUsage.findUnique({
      where: { propertyUsageId: BigInt(data.propertyUsageId) },
    });
    if (!row) return NextResponse.json({ error: "Property usage not found" }, { status: 400 });
  }

  if (data.ownershipTypeId != null) {
    const row = await prisma.ownershipType.findUnique({
      where: { ownershipTypeId: BigInt(data.ownershipTypeId) },
    });
    if (!row) return NextResponse.json({ error: "Ownership type not found" }, { status: 400 });
  }

  if (data.propertyBrandId != null) {
    const row = await prisma.propertyBrand.findUnique({
      where: { propertyBrandId: BigInt(data.propertyBrandId) },
    });
    if (!row) return NextResponse.json({ error: "Property brand not found" }, { status: 400 });
  }

  const country = await prisma.country.findUnique({ where: { countryId: data.countryId } });
  if (!country) return NextResponse.json({ error: "Country not found" }, { status: 400 });

  if (data.cityId != null) {
    const city = await prisma.city.findUnique({ where: { cityId: data.cityId } });
    if (!city || city.countryId !== data.countryId) {
      return NextResponse.json({ error: "City does not belong to the selected country" }, { status: 400 });
    }
  }

  return null;
}

type WriteData = z.infer<typeof propertyWriteSchema>;

function addressScalars(data: WriteData) {
  return {
    addressLine1: trimOrNull(data.addressLine1) ?? null,
    addressLine2: trimOrNull(data.addressLine2) ?? null,
    buildingName: trimOrNull(data.buildingName) ?? null,
    buildingNumber: trimOrNull(data.buildingNumber) ?? null,
    streetName: trimOrNull(data.streetName) ?? null,
    streetNumber: trimOrNull(data.streetNumber) ?? null,
    zoneNumber: trimOrNull(data.zoneNumber) ?? null,
    countryId: data.countryId,
    stateId: data.stateId ?? null,
    cityId: data.cityId ?? null,
    areaId: data.areaId ?? null,
    locationId: data.locationId ?? null,
    postalCode: trimOrNull(data.postalCode) ?? null,
    poBox: trimOrNull(data.poBox) ?? null,
    landmark: trimOrNull(data.landmark) ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    googlePlaceId: trimOrNull(data.googlePlaceId) ?? null,
    googleMapUrl: trimOrNull(data.googleMapUrl) ?? null,
    plusCode: trimOrNull(data.plusCode) ?? null,
    timeZoneId: data.timeZoneId ?? null,
  };
}

export function toPropertyCreateData(
  data: WriteData & { createdBy: number }
): Prisma.PropertyUncheckedCreateInput {
  const typeIds = [...new Set(data.propertyTypeIds)];
  const categoryIds = [...new Set(data.propertyCategoryIds ?? [])];
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyCode: data.propertyCode.trim(),
    propertyName: trimOrNull(data.propertyName) ?? null,
    propertyDisplayName: trimOrNull(data.propertyDisplayName) ?? null,
    shortDescription: trimOrNull(data.shortDescription) ?? null,
    description: trimOrNull(data.description) ?? null,
    internalRemarks: trimOrNull(data.internalRemarks) ?? null,
    propertyUsageId: data.propertyUsageId != null ? BigInt(data.propertyUsageId) : null,
    ownershipTypeId: data.ownershipTypeId != null ? BigInt(data.ownershipTypeId) : null,
    propertyBrandId: data.propertyBrandId != null ? BigInt(data.propertyBrandId) : null,
    supplierId: data.supplierId ?? null,
    ...addressScalars(data),
    openingDate: parseDateOnly(data.openingDate) ?? null,
    closingDate: parseDateOnly(data.closingDate) ?? null,
    rating: data.rating ?? null,
    starRating: data.starRating ?? null,
    isFeatured: data.isFeatured ?? false,
    isPublished: data.isPublished ?? false,
    isActive: data.isActive ?? true,
    createdBy: data.createdBy,
    typeLinks: { create: typeIds.map((propertyTypeId) => ({ propertyTypeId: BigInt(propertyTypeId) })) },
    categoryLinks: {
      create: categoryIds.map((propertyCategoryId) => ({ propertyCategoryId: BigInt(propertyCategoryId) })),
    },
  };
}

export function toPropertyUpdateScalars(
  data: WriteData & { modifiedBy: number }
): Prisma.PropertyUncheckedUpdateInput {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyCode: data.propertyCode.trim(),
    propertyName: trimOrNull(data.propertyName) ?? null,
    propertyDisplayName: trimOrNull(data.propertyDisplayName) ?? null,
    shortDescription: trimOrNull(data.shortDescription) ?? null,
    description: trimOrNull(data.description) ?? null,
    internalRemarks: trimOrNull(data.internalRemarks) ?? null,
    propertyUsageId: data.propertyUsageId != null ? BigInt(data.propertyUsageId) : null,
    ownershipTypeId: data.ownershipTypeId != null ? BigInt(data.ownershipTypeId) : null,
    propertyBrandId: data.propertyBrandId != null ? BigInt(data.propertyBrandId) : null,
    supplierId: data.supplierId ?? null,
    ...addressScalars(data),
    openingDate: parseDateOnly(data.openingDate) ?? null,
    closingDate: parseDateOnly(data.closingDate) ?? null,
    rating: data.rating ?? null,
    starRating: data.starRating ?? null,
    isFeatured: data.isFeatured,
    isPublished: data.isPublished,
    isActive: data.isActive,
    modifiedBy: data.modifiedBy,
    modifiedDtTm: new Date(),
  };
}
