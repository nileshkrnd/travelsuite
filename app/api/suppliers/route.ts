import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  generateSupplierCode,
  serializeSupplierRow,
  supplierInclude,
  supplierWriteSchema,
  toSupplierCreateData,
  validateSupplierLookups,
  withCompanyName,
} from "@/lib/api/supplier-helpers";

const createSchema = supplierWriteSchema.and(
  z.object({
    createdBy: z.number().int().positive(),
  })
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const where: Prisma.SupplierWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (activeOnly) where.isActive = true;
    if (!includeDeleted) where.isDeleted = false;

    const rows = await prisma.supplier.findMany({
      where,
      include: supplierInclude,
      orderBy: [{ createdDtTm: "desc" }, { supplierCode: "asc" }],
    });
    return NextResponse.json((await withCompanyName(rows)).map(serializeSupplierRow));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const lookupError = await validateSupplierLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.$transaction(async (tx) => {
      const supplierCode = await generateSupplierCode(tx, data.tenantId);
      return tx.supplier.create({
        data: toSupplierCreateData({ ...data, supplierCode, createdBy: data.createdBy }),
        include: supplierInclude,
      });
    });
    const [withName] = await withCompanyName([created]);
    return NextResponse.json(serializeSupplierRow(withName), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This supplier code already exists for this tenant" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
