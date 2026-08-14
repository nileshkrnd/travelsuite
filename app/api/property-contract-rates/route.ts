import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractRateInclude,
  propertyContractRateWriteSchema,
  serializePropertyContractRateRow,
  toPropertyContractRateCreateData,
  validatePropertyContractRateLookups,
} from "@/lib/api/property-contract-rate-helpers";

const createSchema = propertyContractRateWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const propertyContractIdParam = searchParams.get("propertyContractId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyContractRateWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyContractIdParam) where.propertyContractId = BigInt(propertyContractIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyContractRate.findMany({
      where,
      include: propertyContractRateInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(serializePropertyContractRateRow));
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
    const lookupError = await validatePropertyContractRateLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.propertyContractRate.create({
      data: toPropertyContractRateCreateData(data),
      include: propertyContractRateInclude,
    });
    return NextResponse.json(serializePropertyContractRateRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A rate already exists for this season, plan, room type, and occupancy combination" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
