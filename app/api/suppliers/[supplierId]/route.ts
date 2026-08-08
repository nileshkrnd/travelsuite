import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  serializeSupplierRow,
  supplierInclude,
  supplierWriteSchema,
  toSupplierUpdateScalars,
  validateSupplierLookups,
  withCompanyName,
} from "@/lib/api/supplier-helpers";

const idSchema = z.coerce.number().int().positive();

const updateSchema = supplierWriteSchema.and(
  z.object({
    modifiedBy: z.number().int().positive(),
  })
);

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ supplierId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { supplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

    const row = await prisma.supplier.findFirst({
      where: { supplierId: BigInt(id.data), isDeleted: false },
      include: supplierInclude,
    });
    if (!row) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    const [withName] = await withCompanyName([row]);
    return NextResponse.json(serializeSupplierRow(withName));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { supplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const lookupError = await validateSupplierLookups(data);
    if (lookupError) return lookupError;

    const updated = await prisma.supplier.update({
      where: { supplierId: BigInt(id.data) },
      data: toSupplierUpdateScalars(data),
      include: supplierInclude,
    });
    const [withName] = await withCompanyName([updated]);
    return NextResponse.json(serializeSupplierRow(withName));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This supplier code already exists for this tenant" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { supplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.supplier.update({
      where: { supplierId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: supplierInclude,
    });
    const [withName] = await withCompanyName([updated]);
    return NextResponse.json(serializeSupplierRow(withName));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

/** Soft delete — sets IsDeleted = true rather than removing the row. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { supplierId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid supplier id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const modifiedBy = Number(searchParams.get("modifiedBy"));

    await prisma.supplier.update({
      where: { supplierId: BigInt(id.data) },
      data: {
        isDeleted: true,
        modifiedBy: Number.isFinite(modifiedBy) && modifiedBy > 0 ? modifiedBy : undefined,
        modifiedDtTm: new Date(),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
