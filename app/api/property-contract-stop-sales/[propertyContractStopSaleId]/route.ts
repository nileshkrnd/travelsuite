import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractStopSaleInclude,
  propertyContractStopSaleWriteSchema,
  serializePropertyContractStopSaleRow,
  updatePropertyContractStopSaleWithChildren,
  validatePropertyContractStopSaleLookups,
} from "@/lib/api/property-contract-stop-sale-helpers";

const idSchema = z.coerce.number().int().positive();
const updateSchema = propertyContractStopSaleWriteSchema.and(
  z.object({ modifiedBy: z.number().int().positive() })
);
const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyContractStopSaleId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyContractStopSaleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.propertyContractStopSale.findUnique({
      where: { propertyContractStopSaleId: BigInt(id.data) },
      include: propertyContractStopSaleInclude,
    });
    if (!row) return NextResponse.json({ error: "Stop sale not found" }, { status: 404 });
    return NextResponse.json(serializePropertyContractStopSaleRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyContractStopSaleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validatePropertyContractStopSaleLookups(data);
    if (lookupError) return lookupError;

    const updated = await updatePropertyContractStopSaleWithChildren(BigInt(id.data), data);
    return NextResponse.json(serializePropertyContractStopSaleRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Stop sale not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyContractStopSaleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyContractStopSale.update({
      where: { propertyContractStopSaleId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyContractStopSaleInclude,
    });
    return NextResponse.json(serializePropertyContractStopSaleRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Stop sale not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyContractStopSaleId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyContractStopSale.delete({
      where: { propertyContractStopSaleId: BigInt(id.data) },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Stop sale not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
