import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  serializeSupplierPropertyAccessRow,
  supplierPropertyAccessInclude,
  supplierPropertyAccessWriteSchema,
  toSupplierPropertyAccessUpdateScalars,
  validateSupplierPropertyAccessLookups,
} from "@/lib/api/supplier-property-access-helpers";

const idSchema = z.coerce.number().int().positive();
const patchSchema = z.object({ isActive: z.boolean() });

type RouteContext = { params: Promise<{ supplierPropertyAccessId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { supplierPropertyAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.supplierPropertyAccess.findUnique({
      where: { supplierPropertyAccessId: BigInt(id.data) },
      include: supplierPropertyAccessInclude,
    });
    if (!row) return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
    return NextResponse.json(serializeSupplierPropertyAccessRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { supplierPropertyAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = supplierPropertyAccessWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validateSupplierPropertyAccessLookups(data);
    if (lookupError) return lookupError;

    const updated = await prisma.supplierPropertyAccess.update({
      where: { supplierPropertyAccessId: BigInt(id.data) },
      data: toSupplierPropertyAccessUpdateScalars(data),
      include: supplierPropertyAccessInclude,
    });
    return NextResponse.json(serializeSupplierPropertyAccessRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This user already has access to this property/supplier link" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { supplierPropertyAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.supplierPropertyAccess.update({
      where: { supplierPropertyAccessId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive },
      include: supplierPropertyAccessInclude,
    });
    return NextResponse.json(serializeSupplierPropertyAccessRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { supplierPropertyAccessId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.supplierPropertyAccess.delete({ where: { supplierPropertyAccessId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Access grant not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
