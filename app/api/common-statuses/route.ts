import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  commonStatusTypeId: z.number().int().positive(),
  statusCode: z.string().trim().min(1).max(50),
  statusName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  displayOrder: z.number().int().optional(),
  isInitial: z.boolean().optional(),
  isFinal: z.boolean().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = { statusType: { select: { statusTypeName: true } } } as const;

async function withCompanyName<T extends { companyId: number | null; commonStatusId: bigint; commonStatusTypeId: bigint }>(rows: T[]) {
  const companyIds = [...new Set(rows.map((r) => r.companyId).filter((id): id is number => id != null))];
  const companies =
    companyIds.length === 0
      ? []
      : await prisma.company.findMany({ where: { companyId: { in: companyIds } }, select: { companyId: true, companyName: true } });
  const nameById = new Map(companies.map((c) => [c.companyId, c.companyName]));
  return rows.map((r) => ({
    ...r,
    commonStatusId: Number(r.commonStatusId),
    commonStatusTypeId: Number(r.commonStatusTypeId),
    companyName: r.companyId != null ? (nameById.get(r.companyId) ?? null) : null,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const statusTypeIdParam = searchParams.get("commonStatusTypeId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.CommonStatusWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (statusTypeIdParam != null && statusTypeIdParam !== "") where.commonStatusTypeId = BigInt(statusTypeIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.commonStatus.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { statusCode: "asc" }],
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

    const statusType = await prisma.commonStatusType.findUnique({ where: { commonStatusTypeId: BigInt(data.commonStatusTypeId) } });
    if (!statusType) {
      return NextResponse.json({ error: "Status type not found" }, { status: 400 });
    }

    const created = await prisma.commonStatus.create({
      data: {
        commonStatusTypeId: BigInt(data.commonStatusTypeId),
        statusCode: data.statusCode.trim().toUpperCase(),
        statusName: data.statusName.trim(),
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isInitial: data.isInitial ?? false,
        isFinal: data.isFinal ?? false,
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
      return NextResponse.json({ error: "This status code already exists for this status type" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
