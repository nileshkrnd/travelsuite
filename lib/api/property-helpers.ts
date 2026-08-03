import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const optionalPositiveInt = z
  .union([z.number().int().positive(), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

export const propertyWriteSchema = z
  .object({
    tenantId: z.number().int().positive(),
    companyId: z.number().int().positive(),
    propertyCode: z.string().trim().min(1).max(50),
    propertyTypeId: z.number().int().positive(),
    propertyCategoryId: optionalPositiveInt,
    propertyUsageId: optionalPositiveInt,
    ownershipTypeId: optionalPositiveInt,
    propertyBrandId: optionalPositiveInt,
    supplierId: optionalPositiveInt,
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
  propertyType: { select: { propertyTypeName: true } },
  propertyCategory: { select: { propertyCategoryName: true } },
  propertyUsage: { select: { propertyUsageName: true } },
  ownershipType: { select: { ownershipTypeName: true } },
  propertyBrand: { select: { propertyBrandName: true } },
} as const;

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

export async function validatePropertyLookups(data: {
  tenantId: number;
  companyId: number;
  propertyTypeId: number;
  propertyCategoryId?: number | null;
  propertyUsageId?: number | null;
  ownershipTypeId?: number | null;
  propertyBrandId?: number | null;
}): Promise<NextResponse | null> {
  const company = await prisma.company.findFirst({
    where: { companyId: data.companyId, tenantId: data.tenantId },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
  }

  const type = await prisma.propertyType.findUnique({ where: { propertyTypeId: data.propertyTypeId } });
  if (!type) return NextResponse.json({ error: "Property type not found" }, { status: 400 });
  if (type.tenantId !== data.tenantId || type.companyId !== data.companyId) {
    return NextResponse.json({ error: "Property type does not belong to this company" }, { status: 400 });
  }

  if (data.propertyCategoryId != null) {
    const row = await prisma.propertyCategory.findUnique({
      where: { propertyCategoryId: data.propertyCategoryId },
    });
    if (!row || row.tenantId !== data.tenantId || row.companyId !== data.companyId) {
      return NextResponse.json({ error: "Property category does not belong to this company" }, { status: 400 });
    }
  }

  if (data.propertyUsageId != null) {
    const row = await prisma.propertyUsage.findUnique({ where: { propertyUsageId: data.propertyUsageId } });
    if (!row || row.tenantId !== data.tenantId || row.companyId !== data.companyId) {
      return NextResponse.json({ error: "Property usage does not belong to this company" }, { status: 400 });
    }
  }

  if (data.ownershipTypeId != null) {
    const row = await prisma.ownershipType.findUnique({ where: { ownershipTypeId: data.ownershipTypeId } });
    if (!row || row.tenantId !== data.tenantId || row.companyId !== data.companyId) {
      return NextResponse.json({ error: "Ownership type does not belong to this company" }, { status: 400 });
    }
  }

  if (data.propertyBrandId != null) {
    const row = await prisma.propertyBrand.findUnique({ where: { propertyBrandId: data.propertyBrandId } });
    if (!row || row.tenantId !== data.tenantId || row.companyId !== data.companyId) {
      return NextResponse.json({ error: "Property brand does not belong to this company" }, { status: 400 });
    }
  }

  return null;
}

export function toPropertyCreateData(
  data: z.infer<typeof propertyWriteSchema> & { createdBy: number }
): Prisma.PropertyUncheckedCreateInput {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyCode: data.propertyCode.trim(),
    propertyTypeId: data.propertyTypeId,
    propertyCategoryId: data.propertyCategoryId ?? null,
    propertyUsageId: data.propertyUsageId ?? null,
    ownershipTypeId: data.ownershipTypeId ?? null,
    propertyBrandId: data.propertyBrandId ?? null,
    supplierId: data.supplierId ?? null,
    openingDate: parseDateOnly(data.openingDate) ?? null,
    closingDate: parseDateOnly(data.closingDate) ?? null,
    rating: data.rating ?? null,
    starRating: data.starRating ?? null,
    isFeatured: data.isFeatured ?? false,
    isPublished: data.isPublished ?? false,
    isActive: data.isActive ?? true,
    createdBy: data.createdBy,
  };
}

export function toPropertyUpdateData(
  data: z.infer<typeof propertyWriteSchema> & { modifiedBy: number }
): Prisma.PropertyUncheckedUpdateInput {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyCode: data.propertyCode.trim(),
    propertyTypeId: data.propertyTypeId,
    propertyCategoryId: data.propertyCategoryId ?? null,
    propertyUsageId: data.propertyUsageId ?? null,
    ownershipTypeId: data.ownershipTypeId ?? null,
    propertyBrandId: data.propertyBrandId ?? null,
    supplierId: data.supplierId ?? null,
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
