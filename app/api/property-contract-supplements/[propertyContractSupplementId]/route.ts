import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyContractSupplementInclude,
  propertyContractSupplementWriteSchema,
  serializePropertyContractSupplementRow,
  updatePropertyContractSupplementWithChildren,
  validatePropertyContractSupplementLookups,
} from "@/lib/api/property-contract-supplement-helpers";

const idSchema = z.coerce.number().int().positive();
const updateSchema = propertyContractSupplementWriteSchema.and(
  z.object({ modifiedBy: z.number().int().positive() })
);
const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyContractSupplementId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyContractSupplementId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.propertyContractSupplement.findUnique({
      where: { propertyContractSupplementId: BigInt(id.data) },
      include: propertyContractSupplementInclude,
    });
    if (!row) return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
    return NextResponse.json(serializePropertyContractSupplementRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyContractSupplementId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validatePropertyContractSupplementLookups(data);
    if (lookupError) return lookupError;

    const updated = await updatePropertyContractSupplementWithChildren(BigInt(id.data), data);
    return NextResponse.json(serializePropertyContractSupplementRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Supplement code already exists on this contract" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyContractSupplementId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyContractSupplement.update({
      where: { propertyContractSupplementId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyContractSupplementInclude,
    });
    return NextResponse.json(serializePropertyContractSupplementRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyContractSupplementId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyContractSupplement.delete({
      where: { propertyContractSupplementId: BigInt(id.data) },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
