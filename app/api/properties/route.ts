import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyInclude,
  propertyWriteSchema,
  toPropertyCreateData,
  validatePropertyLookups,
  withCompanyName,
} from "@/lib/api/property-helpers";

const createSchema = propertyWriteSchema.and(
  z.object({
    createdBy: z.number().int().positive(),
  })
);

/** Property list — filter by TenantID / CompanyID. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const propertyTypeIdParam = searchParams.get("propertyTypeId");

    const where: Prisma.PropertyWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") {
      where.tenantId = Number(tenantIdParam);
    }
    if (companyIdParam != null && companyIdParam !== "") {
      where.companyId = Number(companyIdParam);
    }
    if (activeOnly) where.isActive = true;
    if (propertyTypeIdParam != null && propertyTypeIdParam !== "") {
      where.typeLinks = { some: { propertyTypeId: Number(propertyTypeIdParam) } };
    }

    const rows = await prisma.property.findMany({
      where,
      include: propertyInclude,
      orderBy: [{ createdDtTm: "desc" }, { propertyCode: "asc" }],
    });
    return NextResponse.json(await withCompanyName(rows));
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
    const lookupError = await validatePropertyLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.property.create({
      data: toPropertyCreateData(data),
      include: propertyInclude,
    });
    const [withName] = await withCompanyName([created]);
    return NextResponse.json(withName, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This property code already exists for this company" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
