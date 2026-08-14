import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  createPropertyContractPromotionWithChildren,
  propertyContractPromotionInclude,
  propertyContractPromotionWriteSchema,
  serializePropertyContractPromotionRow,
  validatePropertyContractPromotionLookups,
} from "@/lib/api/property-contract-promotion-helpers";

const createSchema = propertyContractPromotionWriteSchema.and(
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

    const where: Prisma.PropertyContractPromotionWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyContractIdParam) where.propertyContractId = BigInt(propertyContractIdParam);
    if (propertyIdParam) {
      where.propertyContract = { propertyId: Number(propertyIdParam) };
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyContractPromotion.findMany({
      where,
      include: propertyContractPromotionInclude,
      orderBy: [{ priority: "desc" }, { promotionCode: "asc" }],
    });
    return NextResponse.json(rows.map(serializePropertyContractPromotionRow));
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
    const lookupError = await validatePropertyContractPromotionLookups(data);
    if (lookupError) return lookupError;

    const created = await createPropertyContractPromotionWithChildren(data);
    return NextResponse.json(serializePropertyContractPromotionRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Promotion code already exists on this contract" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
