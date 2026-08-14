import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractInclude,
  propertyContractWriteSchema,
  serializePropertyContractRow,
  toPropertyContractCreateData,
  validatePropertyContractLookups,
} from "@/lib/api/property-contract-helpers";

const createSchema = propertyContractWriteSchema.and(z.object({ createdBy: z.number().int().positive() }));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const propertyIdParam = searchParams.get("propertyId");
    const supplierIdParam = searchParams.get("supplierId");
    const contractStatusIdParam = searchParams.get("contractStatusId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyContractWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyIdParam) where.propertyId = Number(propertyIdParam);
    if (supplierIdParam) where.supplierId = BigInt(supplierIdParam);
    if (contractStatusIdParam) where.contractStatusId = BigInt(contractStatusIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyContract.findMany({
      where,
      include: propertyContractInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(serializePropertyContractRow));
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
    const lookupError = await validatePropertyContractLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.propertyContract.create({
      data: toPropertyContractCreateData(data),
      include: propertyContractInclude,
    });
    return NextResponse.json(serializePropertyContractRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A contract with this number already exists for this property" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
