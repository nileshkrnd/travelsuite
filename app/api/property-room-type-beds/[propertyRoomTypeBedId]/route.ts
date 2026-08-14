import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  bedTypeId: z.number().int().positive(),
  bedCount: z.number().int().positive().optional(),
  isExtraBed: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyRoomTypeBedId: string }> };

const bedInclude = { bedType: { select: { bedTypeCode: true, bedTypeName: true } } } as const;

function serialize<T extends { propertyRoomTypeBedId: bigint; propertyRoomId: bigint; bedTypeId: bigint }>(row: T) {
  return {
    ...row,
    propertyRoomTypeBedId: Number(row.propertyRoomTypeBedId),
    propertyRoomId: Number(row.propertyRoomId),
    bedTypeId: Number(row.bedTypeId),
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeBedId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.propertyRoomTypeBed.update({
      where: { propertyRoomTypeBedId: BigInt(id.data) },
      data: {
        bedTypeId: BigInt(data.bedTypeId),
        bedCount: data.bedCount ?? 1,
        isExtraBed: data.isExtraBed ?? false,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: bedInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Bed configuration not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeBedId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyRoomTypeBed.update({
      where: { propertyRoomTypeBedId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: bedInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Bed configuration not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeBedId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyRoomTypeBed.delete({ where: { propertyRoomTypeBedId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Bed configuration not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
