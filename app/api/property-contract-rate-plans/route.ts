import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractRatePlanInclude,
  propertyContractRatePlanWriteSchema,
  serializePropertyContractRatePlanRow,
  toPropertyContractRatePlanCreateData,
  validatePropertyContractRatePlanLookups,
} from "@/lib/api/property-contract-rate-plan-helpers";

const createSchema = propertyContractRatePlanWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const propertyContractIdParam = searchParams.get("propertyContractId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyContractRatePlanWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyContractIdParam) where.propertyContractId = BigInt(propertyContractIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyContractRatePlan.findMany({
      where,
      include: propertyContractRatePlanInclude,
      orderBy: [{ displayOrder: "asc" }, { ratePlanName: "asc" }],
    });
    return NextResponse.json(rows.map(serializePropertyContractRatePlanRow));
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
    const lookupError = await validatePropertyContractRatePlanLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.propertyContractRatePlan.create({
      data: toPropertyContractRatePlanCreateData(data),
      include: propertyContractRatePlanInclude,
    });
    return NextResponse.json(serializePropertyContractRatePlanRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A rate plan with this code already exists on this contract" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
