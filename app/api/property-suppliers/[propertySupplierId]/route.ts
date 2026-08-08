import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  clearOtherPrimaries,
  propertySupplierInclude,
  propertySupplierWriteSchema,
  serializePropertySupplierRow,
  toPropertySupplierUpdateScalars,
  validatePropertySupplierLookups,
} from "@/lib/api/property-supplier-helpers";

const idSchema = z.coerce.number().int().positive();

const patchSchema = z.object({ isActive: z.boolean() });

type RouteContext = { params: Promise<{ propertySupplierId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertySupplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = propertySupplierWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validatePropertySupplierLookups(data);
    if (lookupError) return lookupError;

    const bigId = BigInt(id.data);
    const updated = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) await clearOtherPrimaries(tx, data.propertyId, bigId);
      return tx.propertySupplier.update({
        where: { propertySupplierId: bigId },
        data: toPropertySupplierUpdateScalars(data),
        include: propertySupplierInclude,
      });
    });
    return NextResponse.json(serializePropertySupplierRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Link not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This supplier is already linked to this property" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertySupplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertySupplier.update({
      where: { propertySupplierId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive },
      include: propertySupplierInclude,
    });
    return NextResponse.json(serializePropertySupplierRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertySupplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertySupplier.delete({ where: { propertySupplierId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
