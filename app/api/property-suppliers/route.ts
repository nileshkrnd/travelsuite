import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  clearOtherPrimaries,
  propertySupplierInclude,
  propertySupplierWriteSchema,
  serializePropertySupplierRow,
  toPropertySupplierCreateData,
  validatePropertySupplierLookups,
} from "@/lib/api/property-supplier-helpers";

const createSchema = propertySupplierWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    const supplierIdParam = searchParams.get("supplierId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertySupplierWhereInput = {};
    if (propertyIdParam) where.propertyId = Number(propertyIdParam);
    if (supplierIdParam) where.supplierId = BigInt(supplierIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertySupplier.findMany({
      where,
      include: propertySupplierInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(serializePropertySupplierRow));
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
    const lookupError = await validatePropertySupplierLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) await clearOtherPrimaries(tx, data.propertyId);
      return tx.propertySupplier.create({
        data: toPropertySupplierCreateData({ ...data, createdBy: data.createdBy }),
        include: propertySupplierInclude,
      });
    });
    return NextResponse.json(serializePropertySupplierRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This supplier is already linked to this property" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
