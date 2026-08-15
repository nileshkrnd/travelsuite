import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractSeasonPeriodInclude,
  propertyContractSeasonPeriodWriteSchema,
  serializePropertyContractSeasonPeriodRow,
  toPropertyContractSeasonPeriodCreateData,
  validatePropertyContractSeasonPeriodLookups,
} from "@/lib/api/property-contract-season-period-helpers";

const createSchema = propertyContractSeasonPeriodWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const propertyContractIdParam = searchParams.get("propertyContractId");
    const propertySeasonIdParam = searchParams.get("propertySeasonId");
    const propertyIdParam = searchParams.get("propertyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyContractSeasonPeriodWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyContractIdParam) where.propertyContractId = BigInt(propertyContractIdParam);
    if (propertySeasonIdParam) where.propertySeasonId = BigInt(propertySeasonIdParam);
    if (propertyIdParam) {
      const propertyId = Number(propertyIdParam);
      if (Number.isFinite(propertyId) && propertyId > 0) {
        where.propertyContract = { propertyId };
      }
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyContractSeasonPeriod.findMany({
      where,
      include: propertyContractSeasonPeriodInclude,
      orderBy: [{ fromDate: "asc" }],
    });
    return NextResponse.json(rows.map(serializePropertyContractSeasonPeriodRow));
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
    const lookupError = await validatePropertyContractSeasonPeriodLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.propertyContractSeasonPeriod.create({
      data: toPropertyContractSeasonPeriodCreateData(data),
      include: propertyContractSeasonPeriodInclude,
    });
    return NextResponse.json(serializePropertyContractSeasonPeriodRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
