import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { rowInclude } from "../route";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceProductCode: z.string().trim().min(1).max(50),
  serviceProductName: z.string().trim().min(1).max(250),
  serviceTypeId: z.number().int().positive(),
  serviceProductClassificationId: z.number().int().positive(),
  serviceProductCategoryId: z.number().int().positive().nullable().optional(),
  supplierId: z.number().int().positive().nullable().optional(),
  countryId: z.number().int().positive().nullable().optional(),
  regionId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive().nullable().optional(),
  shortDescription: z.string().trim().max(20000).optional(),
  description: z.string().trim().max(20000).optional(),
  isOnlineSellable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  commonStatusId: z.number().int().positive(),
  statusChangeRemarks: z.string().trim().max(1000).optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductId: string }> };

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

async function withCompanyName<
  T extends {
    companyId: number;
    serviceProductId: bigint;
    serviceTypeId: bigint;
    serviceProductClassificationId: bigint;
    serviceProductCategoryId: bigint | null;
    supplierId: bigint | null;
    commonStatusId: bigint;
  },
>(row: T) {
  const company = await prisma.company.findUnique({ where: { companyId: row.companyId }, select: { companyName: true } });
  return {
    ...row,
    serviceProductId: Number(row.serviceProductId),
    serviceTypeId: Number(row.serviceTypeId),
    serviceProductClassificationId: Number(row.serviceProductClassificationId),
    serviceProductCategoryId: row.serviceProductCategoryId != null ? Number(row.serviceProductCategoryId) : null,
    supplierId: row.supplierId != null ? Number(row.supplierId) : null,
    commonStatusId: Number(row.commonStatusId),
    companyName: company?.companyName ?? null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

    const row = await prisma.serviceProduct.findUnique({
      where: { serviceProductId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(await withCompanyName(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const company = await prisma.company.findFirst({ where: { companyId: data.companyId, tenantId: data.tenantId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
    }

    const classification = await prisma.serviceProductClassificationMaster.findUnique({
      where: { serviceProductClassificationId: BigInt(data.serviceProductClassificationId) },
    });
    if (!classification) {
      return NextResponse.json({ error: "Classification not found" }, { status: 400 });
    }
    if (Number(classification.serviceTypeId) !== data.serviceTypeId) {
      return NextResponse.json({ error: "Classification must belong to the selected service type" }, { status: 400 });
    }

    if (data.serviceProductCategoryId != null) {
      const category = await prisma.serviceProductCategory.findUnique({
        where: { serviceProductCategoryId: BigInt(data.serviceProductCategoryId) },
      });
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
      }
      if (Number(category.serviceTypeId) !== data.serviceTypeId) {
        return NextResponse.json({ error: "Category must belong to the selected service type" }, { status: 400 });
      }
    }

    const existing = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(id.data) } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.serviceProduct.update({
        where: { serviceProductId: BigInt(id.data) },
        data: {
          serviceProductCode: data.serviceProductCode.trim().toUpperCase(),
          serviceProductName: data.serviceProductName.trim(),
          serviceTypeId: BigInt(data.serviceTypeId),
          serviceProductClassificationId: BigInt(data.serviceProductClassificationId),
          serviceProductCategoryId: data.serviceProductCategoryId != null ? BigInt(data.serviceProductCategoryId) : null,
          supplierId: data.supplierId != null ? BigInt(data.supplierId) : null,
          countryId: data.countryId ?? null,
          regionId: data.regionId ?? null,
          cityId: data.cityId ?? null,
          shortDescription: data.shortDescription?.trim() || null,
          description: data.description?.trim() || null,
          isOnlineSellable: data.isOnlineSellable ?? false,
          isFeatured: data.isFeatured ?? false,
          displayOrder: data.displayOrder ?? 0,
          commonStatusId: BigInt(data.commonStatusId),
          tenantId: data.tenantId,
          companyId: data.companyId,
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include: rowInclude,
      });

      if (Number(existing.commonStatusId) !== data.commonStatusId) {
        await tx.serviceProductStatusHistory.create({
          data: {
            serviceProductId: product.serviceProductId,
            fromCommonStatusId: existing.commonStatusId,
            toCommonStatusId: BigInt(data.commonStatusId),
            remarks: data.statusChangeRemarks?.trim() || null,
            changedBy: data.modifiedBy,
          },
        });
      }

      return product;
    });

    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Product not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This product code already exists for this company" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProduct.update({
      where: { serviceProductId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

    await prisma.serviceProduct.delete({ where: { serviceProductId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This product has options or history linked to it and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
