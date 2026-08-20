import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductCode: z.string().trim().min(1).max(50),
  serviceProductName: z.string().trim().min(1).max(250),
  serviceTypeId: z.number().int().positive(),
  serviceProductClassificationId: z.number().int().positive(),
  serviceProductCategoryId: z.number().int().positive().nullable().optional(),
  supplierId: z.number().int().positive().nullable().optional(),
  countryId: z.number().int().positive().nullable().optional(),
  regionId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive().nullable().optional(),
  shortDescription: z.string().trim().max(1000).optional(),
  description: z.string().trim().optional(),
  isOnlineSellable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  commonStatusId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

export const rowInclude = {
  serviceType: { select: { serviceTypeName: true } },
  classification: { select: { classificationName: true } },
  category: { select: { categoryName: true } },
  supplier: { select: { supplierName: true } },
  country: { select: { countryName: true } },
  region: { select: { regionName: true } },
  city: { select: { cityName: true } },
  commonStatus: { select: { statusName: true } },
} as const;

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
>(rows: T[]) {
  const companyIds = [...new Set(rows.map((r) => r.companyId))];
  const companies =
    companyIds.length === 0
      ? []
      : await prisma.company.findMany({ where: { companyId: { in: companyIds } }, select: { companyId: true, companyName: true } });
  const nameById = new Map(companies.map((c) => [c.companyId, c.companyName]));
  return rows.map((r) => ({
    ...r,
    serviceProductId: Number(r.serviceProductId),
    serviceTypeId: Number(r.serviceTypeId),
    serviceProductClassificationId: Number(r.serviceProductClassificationId),
    serviceProductCategoryId: r.serviceProductCategoryId != null ? Number(r.serviceProductCategoryId) : null,
    supplierId: r.supplierId != null ? Number(r.supplierId) : null,
    commonStatusId: Number(r.commonStatusId),
    companyName: nameById.get(r.companyId) ?? null,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const serviceTypeIdParam = searchParams.get("serviceTypeId");
    const classificationIdParam = searchParams.get("serviceProductClassificationId");
    const categoryIdParam = searchParams.get("serviceProductCategoryId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (serviceTypeIdParam != null && serviceTypeIdParam !== "") where.serviceTypeId = BigInt(serviceTypeIdParam);
    if (classificationIdParam != null && classificationIdParam !== "") {
      where.serviceProductClassificationId = BigInt(classificationIdParam);
    }
    if (categoryIdParam != null && categoryIdParam !== "") where.serviceProductCategoryId = BigInt(categoryIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProduct.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { serviceProductCode: "asc" }],
    });
    return NextResponse.json(await withCompanyName(rows));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const company = await prisma.company.findFirst({ where: { companyId: data.companyId, tenantId: data.tenantId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found for this tenant" }, { status: 400 });
    }

    const serviceType = await prisma.serviceTypeMaster.findUnique({ where: { serviceTypeId: BigInt(data.serviceTypeId) } });
    if (!serviceType) {
      return NextResponse.json({ error: "Service type not found" }, { status: 400 });
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

    const commonStatus = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!commonStatus) {
      return NextResponse.json({ error: "Status not found" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.serviceProduct.create({
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
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
        include: rowInclude,
      });
      await tx.serviceProductStatusHistory.create({
        data: {
          serviceProductId: product.serviceProductId,
          fromCommonStatusId: null,
          toCommonStatusId: BigInt(data.commonStatusId),
          remarks: "Product created",
          changedBy: data.createdBy,
        },
      });
      return product;
    });

    const [withName] = await withCompanyName([created]);
    return NextResponse.json(withName, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This product code already exists for this company" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
