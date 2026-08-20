import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  rateTypeCode: z.string().trim().min(1).max(50),
  rateTypeName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  rateTypeGroupId: z.number().int().positive().nullable().optional(),
  isPaxType: z.boolean().optional(),
  isQuantityType: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = { rateTypeGroup: { select: { rateTypeGroupName: true } } } as const;

async function withCompanyName<T extends { companyId: number | null; rateTypeId: bigint; rateTypeGroupId: bigint | null }>(rows: T[]) {
  const companyIds = [...new Set(rows.map((r) => r.companyId).filter((id): id is number => id != null))];
  const companies =
    companyIds.length === 0
      ? []
      : await prisma.company.findMany({ where: { companyId: { in: companyIds } }, select: { companyId: true, companyName: true } });
  const nameById = new Map(companies.map((c) => [c.companyId, c.companyName]));
  return rows.map((r) => ({
    ...r,
    rateTypeId: Number(r.rateTypeId),
    rateTypeGroupId: r.rateTypeGroupId != null ? Number(r.rateTypeGroupId) : null,
    companyName: r.companyId != null ? (nameById.get(r.companyId) ?? null) : null,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const groupIdParam = searchParams.get("rateTypeGroupId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.RateTypeWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (groupIdParam != null && groupIdParam !== "") where.rateTypeGroupId = BigInt(groupIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.rateType.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { rateTypeCode: "asc" }],
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

    if (data.rateTypeGroupId != null) {
      const group = await prisma.rateTypeGroupMaster.findUnique({ where: { rateTypeGroupId: BigInt(data.rateTypeGroupId) } });
      if (!group) {
        return NextResponse.json({ error: "Rate type group not found" }, { status: 400 });
      }
    }

    const created = await prisma.rateType.create({
      data: {
        rateTypeCode: data.rateTypeCode.trim().toUpperCase(),
        rateTypeName: data.rateTypeName.trim(),
        description: data.description?.trim() || null,
        rateTypeGroupId: data.rateTypeGroupId != null ? BigInt(data.rateTypeGroupId) : null,
        isPaxType: data.isPaxType ?? false,
        isQuantityType: data.isQuantityType ?? false,
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
      return NextResponse.json({ error: "This rate type code already exists for this company" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
