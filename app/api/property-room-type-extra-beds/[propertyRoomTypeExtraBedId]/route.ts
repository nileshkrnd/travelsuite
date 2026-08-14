import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  extraBedTypeId: z.number().int().positive(),
  maxQuantity: z.number().int().positive().optional(),
  adultAllowed: z.boolean().optional(),
  childAllowed: z.boolean().optional(),
  isComplimentary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyRoomTypeExtraBedId: string }> };

const extraBedInclude = { extraBedType: { select: { bedTypeCode: true, bedTypeName: true } } } as const;

function serialize<
  T extends { propertyRoomTypeExtraBedId: bigint; propertyRoomId: bigint; extraBedTypeId: bigint },
>(row: T) {
  return {
    ...row,
    propertyRoomTypeExtraBedId: Number(row.propertyRoomTypeExtraBedId),
    propertyRoomId: Number(row.propertyRoomId),
    extraBedTypeId: Number(row.extraBedTypeId),
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeExtraBedId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.propertyRoomTypeExtraBed.update({
      where: { propertyRoomTypeExtraBedId: BigInt(id.data) },
      data: {
        extraBedTypeId: BigInt(data.extraBedTypeId),
        maxQuantity: data.maxQuantity ?? 1,
        adultAllowed: data.adultAllowed ?? true,
        childAllowed: data.childAllowed ?? true,
        isComplimentary: data.isComplimentary ?? false,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: extraBedInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Extra bed policy not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeExtraBedId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyRoomTypeExtraBed.update({
      where: { propertyRoomTypeExtraBedId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: extraBedInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Extra bed policy not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeExtraBedId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyRoomTypeExtraBed.delete({ where: { propertyRoomTypeExtraBedId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Extra bed policy not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
