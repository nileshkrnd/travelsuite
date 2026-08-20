import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  rateTypeGroupCode: z.string().trim().min(1).max(50),
  rateTypeGroupName: z.string().trim().min(1).max(100),
  displayOrder: z.number().int().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

async function withCompanyName<T extends { companyId: number | null; rateTypeGroupId: bigint }>(rows: T[]) {
  const companyIds = [...new Set(rows.map((r) => r.companyId).filter((id): id is number => id != null))];
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
    rateTypeGroupId: Number(r.rateTypeGroupId),
    companyName: r.companyId != null ? (nameById.get(r.companyId) ?? null) : null,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.RateTypeGroupMasterWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.rateTypeGroupMaster.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { rateTypeGroupCode: "asc" }],
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

    const created = await prisma.rateTypeGroupMaster.create({
      data: {
        rateTypeGroupCode: data.rateTypeGroupCode.trim().toUpperCase(),
        rateTypeGroupName: data.rateTypeGroupName.trim(),
        displayOrder: data.displayOrder ?? 0,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    const [withName] = await withCompanyName([created]);
    return NextResponse.json(withName, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This rate type group code already exists for this company" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
