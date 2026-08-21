import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const VALUE_TYPE_CODES = ["BOOLEAN", "TEXT", "NUMBER", "DATE", "TIME", "DATETIME"] as const;

const createSchema = z.object({
  infoTypeCode: z.string().trim().min(1).max(50),
  infoTypeName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).nullable().optional(),
  valueTypeCode: z.enum(VALUE_TYPE_CODES),
  displayOrder: z.number().int().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

function serialize<T extends { additionalInfoTypeId: bigint }>(row: T) {
  return { ...row, additionalInfoTypeId: Number(row.additionalInfoTypeId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.AdditionalInfoTypeMasterWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.additionalInfoTypeMaster.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { infoTypeCode: "asc" }],
    });
    return NextResponse.json(rows.map(serialize));
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

    const created = await prisma.additionalInfoTypeMaster.create({
      data: {
        infoTypeCode: data.infoTypeCode.trim().toUpperCase(),
        infoTypeName: data.infoTypeName.trim(),
        description: data.description?.trim() || null,
        valueTypeCode: data.valueTypeCode,
        displayOrder: data.displayOrder ?? 0,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This info type code already exists for this company" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
