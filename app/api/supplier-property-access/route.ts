import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  serializeSupplierPropertyAccessRow,
  supplierPropertyAccessInclude,
  supplierPropertyAccessWriteSchema,
  toSupplierPropertyAccessCreateData,
  validateSupplierPropertyAccessLookups,
} from "@/lib/api/supplier-property-access-helpers";

const createSchema = supplierPropertyAccessWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const propertySupplierIdParam = searchParams.get("propertySupplierId");
    const userIdParam = searchParams.get("userId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.SupplierPropertyAccessWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertySupplierIdParam) where.propertySupplierId = BigInt(propertySupplierIdParam);
    if (userIdParam) where.userId = Number(userIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.supplierPropertyAccess.findMany({
      where,
      include: supplierPropertyAccessInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(serializeSupplierPropertyAccessRow));
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
    const lookupError = await validateSupplierPropertyAccessLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.supplierPropertyAccess.create({
      data: toSupplierPropertyAccessCreateData({ ...data, createdBy: data.createdBy }),
      include: supplierPropertyAccessInclude,
    });
    return NextResponse.json(serializeSupplierPropertyAccessRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This user already has access to this property/supplier link" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
