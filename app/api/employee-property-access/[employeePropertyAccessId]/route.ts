import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  employeePropertyAccessInclude,
  employeePropertyAccessWriteSchema,
  toEmployeePropertyAccessUpdateScalars,
  validateEmployeePropertyAccessLookups,
} from "@/lib/api/employee-property-access-helpers";

const idSchema = z.coerce.number().int().positive();
const patchSchema = z.object({ isActive: z.boolean() });

type RouteContext = { params: Promise<{ employeePropertyAccessId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { employeePropertyAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = employeePropertyAccessWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validateEmployeePropertyAccessLookups(data);
    if (lookupError) return lookupError;

    const updated = await prisma.employeePropertyAccess.update({
      where: { employeePropertyAccessId: BigInt(id.data) },
      data: toEmployeePropertyAccessUpdateScalars(data),
      include: employeePropertyAccessInclude,
    });
    return NextResponse.json({ ...updated, employeePropertyAccessId: Number(updated.employeePropertyAccessId) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This employee already has access to this property" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { employeePropertyAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.employeePropertyAccess.update({
      where: { employeePropertyAccessId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive },
      include: employeePropertyAccessInclude,
    });
    return NextResponse.json({ ...updated, employeePropertyAccessId: Number(updated.employeePropertyAccessId) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { employeePropertyAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.employeePropertyAccess.delete({ where: { employeePropertyAccessId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
