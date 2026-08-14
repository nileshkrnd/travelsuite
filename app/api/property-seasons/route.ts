import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertySeasonInclude,
  propertySeasonWriteSchema,
  serializePropertySeasonRow,
  toPropertySeasonCreateData,
  validatePropertySeasonLookups,
} from "@/lib/api/property-season-helpers";

const createSchema = propertySeasonWriteSchema.and(z.object({ createdBy: z.number().int().positive() }));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const propertyIdParam = searchParams.get("propertyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertySeasonWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (propertyIdParam) where.propertyId = Number(propertyIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertySeason.findMany({
      where,
      include: propertySeasonInclude,
      orderBy: [{ displayOrder: "asc" }, { seasonName: "asc" }],
    });
    return NextResponse.json(rows.map(serializePropertySeasonRow));
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
    const lookupError = await validatePropertySeasonLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.propertySeason.create({
      data: toPropertySeasonCreateData(data),
      include: propertySeasonInclude,
    });
    return NextResponse.json(serializePropertySeasonRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A season with this code already exists for this property" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
