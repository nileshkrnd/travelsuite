import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertySeasonInclude,
  propertySeasonWriteSchema,
  serializePropertySeasonRow,
  toPropertySeasonUpdateScalars,
  validatePropertySeasonLookups,
} from "@/lib/api/property-season-helpers";

const idSchema = z.coerce.number().int().positive();
const updateSchema = propertySeasonWriteSchema.and(z.object({ modifiedBy: z.number().int().positive() }));
const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertySeasonId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertySeasonId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.propertySeason.findUnique({
      where: { propertySeasonId: BigInt(id.data) },
      include: propertySeasonInclude,
    });
    if (!row) return NextResponse.json({ error: "Season not found" }, { status: 404 });
    return NextResponse.json(serializePropertySeasonRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertySeasonId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validatePropertySeasonLookups(data);
    if (lookupError) return lookupError;

    const updated = await prisma.propertySeason.update({
      where: { propertySeasonId: BigInt(id.data) },
      data: toPropertySeasonUpdateScalars(data),
      include: propertySeasonInclude,
    });
    return NextResponse.json(serializePropertySeasonRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Season not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A season with this code already exists for this property" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertySeasonId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertySeason.update({
      where: { propertySeasonId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertySeasonInclude,
    });
    return NextResponse.json(serializePropertySeasonRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertySeasonId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertySeason.delete({ where: { propertySeasonId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Season not found" }, { status: 404 });
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Season is referenced by contract season periods and cannot be deleted" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}
