import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppEmployeePropertyGrants } from "@/lib/mappers/employee-property-access.mapper";
import {
  employeePropertyAccessInclude,
  employeePropertyGrantWriteSchema,
  saveEmployeePropertyGrant,
  serializeRows,
  validateEmployeePropertyGrantLookups,
} from "@/lib/api/employee-property-access-helpers";

const idSchema = z.coerce.number().int().positive();

const createSchema = employeePropertyGrantWriteSchema.and(
  z.object({ createdBy: z.number().int().positive() })
);

const patchSchema = z.object({ isActive: z.boolean() });

type RouteContext = { params: Promise<{ employeeId: string }> };

/** The aggregated grant for one employee (may be empty). */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { employeeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });

    const rows = await prisma.employeePropertyAccess.findMany({
      where: { employeeId: id.data },
      include: employeePropertyAccessInclude,
      orderBy: [{ propertyId: "asc" }],
    });
    const [grant] = toAppEmployeePropertyGrants(serializeRows(rows));
    if (!grant) return NextResponse.json({ error: "No access grant for this employee" }, { status: 404 });
    return NextResponse.json(grant);
  } catch (error) {
    return dbUnavailable(error);
  }
}

/** Full-replace save of this employee's property-access grant. */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { employeeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validateEmployeePropertyGrantLookups({ ...data, employeeId: id.data });
    if (lookupError) return lookupError;

    const rows = await saveEmployeePropertyGrant(id.data, data);
    const [grant] = toAppEmployeePropertyGrants(serializeRows(rows));
    return NextResponse.json(grant, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This employee already has an access grant" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { employeeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const { count } = await prisma.employeePropertyAccess.updateMany({
      where: { employeeId: id.data },
      data: { isActive: parsed.data.isActive },
    });
    if (count === 0) return NextResponse.json({ error: "No access grant for this employee" }, { status: 404 });

    const rows = await prisma.employeePropertyAccess.findMany({
      where: { employeeId: id.data },
      include: employeePropertyAccessInclude,
      orderBy: [{ propertyId: "asc" }],
    });
    const [grant] = toAppEmployeePropertyGrants(serializeRows(rows));
    return NextResponse.json(grant);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { employeeId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });

    await prisma.employeePropertyAccess.deleteMany({ where: { employeeId: id.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
