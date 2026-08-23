import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  b2bCustomerTypeId: z.number().int().positive(),
  categoryCode: z.string().trim().min(1).max(50),
  categoryName: z.string().trim().min(1).max(150),
  description: z.string().trim().max(250).nullable().optional(),
  displayOrder: z.number().int().optional(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  customerType: { select: { customerTypeName: true } },
} as const;

function serialize<T extends { b2bCustomerCategoryId: bigint; b2bCustomerTypeId: bigint }>(row: T) {
  return { ...row, b2bCustomerCategoryId: Number(row.b2bCustomerCategoryId), b2bCustomerTypeId: Number(row.b2bCustomerTypeId) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const typeIdParam = searchParams.get("b2bCustomerTypeId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.B2BCustomerCategoryWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (typeIdParam != null && typeIdParam !== "") where.b2bCustomerTypeId = BigInt(typeIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.b2BCustomerCategory.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { categoryCode: "asc" }],
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

    const type = await prisma.b2BCustomerType.findUnique({
      where: { b2bCustomerTypeId: BigInt(data.b2bCustomerTypeId) },
    });
    if (!type) {
      return NextResponse.json({ error: "B2B customer type not found" }, { status: 400 });
    }

    const created = await prisma.b2BCustomerCategory.create({
      data: {
        b2bCustomerTypeId: BigInt(data.b2bCustomerTypeId),
        categoryCode: data.categoryCode.trim().toUpperCase(),
        categoryName: data.categoryName.trim(),
        description: data.description?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This category code already exists for this type" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
