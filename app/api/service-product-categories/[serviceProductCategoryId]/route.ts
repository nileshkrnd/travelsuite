import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceTypeId: z.number().int().positive(),
  serviceProductClassificationId: z.number().int().positive().nullable().optional(),
  parentServiceProductCategoryId: z.number().int().positive().nullable().optional(),
  categoryCode: z.string().trim().min(1).max(50),
  categoryName: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(200).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  displayOrder: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductCategoryId: string }> };

const rowInclude = {
  serviceType: { select: { serviceTypeName: true } },
  classification: { select: { classificationName: true } },
  parent: { select: { categoryName: true } },
} as const;

/** P2003 covers most FK violations, but some RESTRICT violations surface as an unmapped connector error instead — match on the Postgres error code/message as a fallback. */
function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

async function withCompanyName<
  T extends {
    companyId: number;
    serviceProductCategoryId: bigint;
    serviceTypeId: bigint;
    serviceProductClassificationId: bigint | null;
    parentServiceProductCategoryId: bigint | null;
  },
>(row: T) {
  const company = await prisma.company.findUnique({
    where: { companyId: row.companyId },
    select: { companyName: true },
  });
  return {
    ...row,
    serviceProductCategoryId: Number(row.serviceProductCategoryId),
    serviceTypeId: Number(row.serviceTypeId),
    serviceProductClassificationId:
      row.serviceProductClassificationId != null ? Number(row.serviceProductClassificationId) : null,
    parentServiceProductCategoryId:
      row.parentServiceProductCategoryId != null ? Number(row.parentServiceProductCategoryId) : null,
    companyName: company?.companyName ?? null,
  };
}

/** Rejects self-parenting and cycles; requires the parent to belong to the same Service Type. */
async function assertValidParent(
  serviceTypeId: number,
  categoryId: number,
  parentCategoryId: number | null | undefined
): Promise<string | null> {
  if (parentCategoryId == null) return null;
  if (parentCategoryId === categoryId) return "A category cannot be its own parent";

  const parent = await prisma.serviceProductCategory.findUnique({
    where: { serviceProductCategoryId: BigInt(parentCategoryId) },
  });
  if (!parent) return "Parent category not found";
  if (Number(parent.serviceTypeId) !== serviceTypeId) {
    return "Parent category must belong to the same service type";
  }

  let cursor: number | null = parentCategoryId;
  const seen = new Set<number>();
  while (cursor != null) {
    if (cursor === categoryId) return "Cannot set parent — would create a cycle";
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const row: { parentServiceProductCategoryId: bigint | null } | null =
      await prisma.serviceProductCategory.findUnique({
        where: { serviceProductCategoryId: BigInt(cursor) },
        select: { parentServiceProductCategoryId: true },
      });
    cursor = row?.parentServiceProductCategoryId != null ? Number(row.parentServiceProductCategoryId) : null;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductCategoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid category id" }, { status: 400 });

    const row = await prisma.serviceProductCategory.findUnique({
      where: { serviceProductCategoryId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json(await withCompanyName(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductCategoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid category id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const company = await prisma.company.findFirst({
      where: { companyId: data.companyId, tenantId: data.tenantId },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
    }

    const serviceType = await prisma.serviceTypeMaster.findUnique({
      where: { serviceTypeId: BigInt(data.serviceTypeId) },
    });
    if (!serviceType) {
      return NextResponse.json({ error: "Service type not found" }, { status: 400 });
    }

    if (data.serviceProductClassificationId != null) {
      const classification = await prisma.serviceProductClassificationMaster.findUnique({
        where: { serviceProductClassificationId: BigInt(data.serviceProductClassificationId) },
      });
      if (!classification) {
        return NextResponse.json({ error: "Classification not found" }, { status: 400 });
      }
      if (Number(classification.serviceTypeId) !== data.serviceTypeId) {
        return NextResponse.json(
          { error: "Classification must belong to the same service type" },
          { status: 400 }
        );
      }
    }

    const parentError = await assertValidParent(data.serviceTypeId, id.data, data.parentServiceProductCategoryId);
    if (parentError) {
      return NextResponse.json({ error: parentError }, { status: 400 });
    }

    const updated = await prisma.serviceProductCategory.update({
      where: { serviceProductCategoryId: BigInt(id.data) },
      data: {
        serviceTypeId: BigInt(data.serviceTypeId),
        serviceProductClassificationId:
          data.serviceProductClassificationId != null ? BigInt(data.serviceProductClassificationId) : null,
        parentServiceProductCategoryId:
          data.parentServiceProductCategoryId != null ? BigInt(data.parentServiceProductCategoryId) : null,
        categoryCode: data.categoryCode.trim().toUpperCase(),
        categoryName: data.categoryName.trim(),
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isFeatured: data.isFeatured ?? false,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This category code already exists for this service type" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductCategoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid category id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductCategory.update({
      where: { serviceProductCategoryId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(await withCompanyName(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductCategoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid category id" }, { status: 400 });

    await prisma.serviceProductCategory.delete({
      where: { serviceProductCategoryId: BigInt(id.data) },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json(
        { error: "This category has child categories and cannot be deleted" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
