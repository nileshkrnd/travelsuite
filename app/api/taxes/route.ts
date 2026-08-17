import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { taxInclude, taxWriteSchema, serializeTaxRow, taxScalars, validateTaxLookups } from "@/lib/api/tax-helpers";

const createSchema = taxWriteSchema.and(z.object({ createdBy: z.number().int().positive() }));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.TaxWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") {
      where.OR = [{ tenantId: Number(tenantIdParam) }, { tenantId: null }];
    }
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.tax.findMany({
      where,
      include: taxInclude,
      orderBy: [{ taxCode: "asc" }],
    });
    return NextResponse.json(rows.map(serializeTaxRow));
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
    const lookupError = await validateTaxLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.tax.create({
      data: { ...taxScalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy },
    });
    const withInclude = await prisma.tax.findUniqueOrThrow({
      where: { taxId: created.taxId },
      include: taxInclude,
    });
    return NextResponse.json(serializeTaxRow(withInclude), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This tax code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
