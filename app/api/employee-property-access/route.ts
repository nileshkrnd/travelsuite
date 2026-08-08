import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  employeePropertyAccessInclude,
  employeePropertyAccessWriteSchema,
  toEmployeePropertyAccessCreateData,
  validateEmployeePropertyAccessLookups,
} from "@/lib/api/employee-property-access-helpers";

const createSchema = employeePropertyAccessWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const employeeIdParam = searchParams.get("employeeId");
    const propertyIdParam = searchParams.get("propertyId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.EmployeePropertyAccessWhereInput = {};
    if (tenantIdParam) where.tenantId = Number(tenantIdParam);
    if (companyIdParam) where.companyId = Number(companyIdParam);
    if (employeeIdParam) where.employeeId = Number(employeeIdParam);
    if (propertyIdParam) where.propertyId = Number(propertyIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.employeePropertyAccess.findMany({
      where,
      include: employeePropertyAccessInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map((r) => ({ ...r, employeePropertyAccessId: Number(r.employeePropertyAccessId) })));
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
    const lookupError = await validateEmployeePropertyAccessLookups(data);
    if (lookupError) return lookupError;

    const created = await prisma.employeePropertyAccess.create({
      data: toEmployeePropertyAccessCreateData({ ...data, createdBy: data.createdBy }),
      include: employeePropertyAccessInclude,
    });
    return NextResponse.json(
      { ...created, employeePropertyAccessId: Number(created.employeePropertyAccessId) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This employee already has access to this property" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
