import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  createPropertyContractSupplementWithChildren,
  propertyContractSupplementInclude,
  propertyContractSupplementWriteSchema,
  serializePropertyContractSupplementRow,
  validatePropertyContractSupplementLookups,
} from "@/lib/api/property-contract-supplement-helpers";

const createSchema = propertyContractSupplementWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const propertyContractIdParam = searchParams.get("propertyContractId");
    const propertyIdParam = searchParams.get("propertyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyContractSupplementWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyContractIdParam) where.propertyContractId = BigInt(propertyContractIdParam);
    if (propertyIdParam) {
      where.propertyContract = { propertyId: Number(propertyIdParam) };
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyContractSupplement.findMany({
      where,
      include: propertyContractSupplementInclude,
      orderBy: [{ displayOrder: "asc" }, { supplementCode: "asc" }],
    });
    return NextResponse.json(rows.map(serializePropertyContractSupplementRow));
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
    const lookupError = await validatePropertyContractSupplementLookups(data);
    if (lookupError) return lookupError;

    const created = await createPropertyContractSupplementWithChildren(data);
    return NextResponse.json(serializePropertyContractSupplementRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Supplement code already exists on this contract" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
