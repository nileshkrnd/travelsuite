import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceTypeId: z.number().int().positive(),
  classificationCode: z.string().trim().min(1).max(50),
  classificationName: z.string().trim().min(1).max(150),
  parentClassificationId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(200).optional().or(z.literal("")),
  displayOrder: z.number().int().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  serviceType: { select: { serviceTypeName: true } },
  parent: { select: { classificationName: true } },
} as const;

async function withCompanyName<T extends { companyId: number; serviceProductClassificationId: bigint; serviceTypeId: bigint; parentClassificationId: bigint | null }>(
  rows: T[]
) {
  const companyIds = [...new Set(rows.map((r) => r.companyId))];
  const companies =
    companyIds.length === 0
      ? []
      : await prisma.company.findMany({
          where: { companyId: { in: companyIds } },
          select: { companyId: true, companyName: true },
        });
  const nameById = new Map(companies.map((c) => [c.companyId, c.companyName]));
  return rows.map((r) => ({
    ...r,
    serviceProductClassificationId: Number(r.serviceProductClassificationId),
    serviceTypeId: Number(r.serviceTypeId),
    parentClassificationId: r.parentClassificationId != null ? Number(r.parentClassificationId) : null,
    companyName: nameById.get(r.companyId) ?? null,
  }));
}

/** Service Product Classification list — filter by TenantID / CompanyID / ServiceTypeID. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const serviceTypeIdParam = searchParams.get("serviceTypeId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductClassificationMasterWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (serviceTypeIdParam != null && serviceTypeIdParam !== "") {
      where.serviceTypeId = BigInt(serviceTypeIdParam);
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductClassificationMaster.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { classificationCode: "asc" }],
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

    if (data.parentClassificationId != null) {
      const parent = await prisma.serviceProductClassificationMaster.findUnique({
        where: { serviceProductClassificationId: BigInt(data.parentClassificationId) },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent classification not found" }, { status: 400 });
      }
      if (Number(parent.serviceTypeId) !== data.serviceTypeId) {
        return NextResponse.json(
          { error: "Parent classification must belong to the same service type" },
          { status: 400 }
        );
      }
    }

    const created = await prisma.serviceProductClassificationMaster.create({
      data: {
        serviceTypeId: BigInt(data.serviceTypeId),
        classificationCode: data.classificationCode.trim().toUpperCase(),
        classificationName: data.classificationName.trim(),
        parentClassificationId:
          data.parentClassificationId != null ? BigInt(data.parentClassificationId) : null,
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    const [withName] = await withCompanyName([created]);
    return NextResponse.json(withName, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This classification code already exists for this service type" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
