import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractInventoryInclude,
  propertyContractInventoryWriteSchema,
  serializePropertyContractInventoryRow,
  toPropertyContractInventoryUpdateScalars,
  validatePropertyContractInventoryLookups,
} from "@/lib/api/property-contract-inventory-helpers";

const idSchema = z.coerce.number().int().positive();
const updateSchema = propertyContractInventoryWriteSchema.and(
  z.object({ modifiedBy: z.number().int().positive() })
);
const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyContractInventoryId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyContractInventoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.propertyContractInventory.findUnique({
      where: { propertyContractInventoryId: BigInt(id.data) },
      include: propertyContractInventoryInclude,
    });
    if (!row) return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    return NextResponse.json(serializePropertyContractInventoryRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyContractInventoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validatePropertyContractInventoryLookups(data);
    if (lookupError) return lookupError;

    const updated = await prisma.propertyContractInventory.update({
      where: { propertyContractInventoryId: BigInt(id.data) },
      data: toPropertyContractInventoryUpdateScalars(data),
      include: propertyContractInventoryInclude,
    });
    return NextResponse.json(serializePropertyContractInventoryRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Inventory already exists for this season period and room type" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyContractInventoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyContractInventory.update({
      where: { propertyContractInventoryId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyContractInventoryInclude,
    });
    return NextResponse.json(serializePropertyContractInventoryRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyContractInventoryId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyContractInventory.delete({
      where: { propertyContractInventoryId: BigInt(id.data) },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
