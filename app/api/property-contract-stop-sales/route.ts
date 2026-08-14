import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  createPropertyContractStopSaleWithChildren,
  propertyContractStopSaleInclude,
  propertyContractStopSaleWriteSchema,
  serializePropertyContractStopSaleRow,
  validatePropertyContractStopSaleLookups,
} from "@/lib/api/property-contract-stop-sale-helpers";

const createSchema = propertyContractStopSaleWriteSchema.and(
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

    const where: Prisma.PropertyContractStopSaleWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyContractIdParam) where.propertyContractId = BigInt(propertyContractIdParam);
    if (propertyIdParam) {
      where.propertyContract = { propertyId: Number(propertyIdParam) };
    }
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyContractStopSale.findMany({
      where,
      include: propertyContractStopSaleInclude,
      orderBy: [{ fromDate: "desc" }, { toDate: "desc" }],
    });
    return NextResponse.json(rows.map(serializePropertyContractStopSaleRow));
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
    const lookupError = await validatePropertyContractStopSaleLookups(data);
    if (lookupError) return lookupError;

    const created = await createPropertyContractStopSaleWithChildren(data);
    return NextResponse.json(serializePropertyContractStopSaleRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
