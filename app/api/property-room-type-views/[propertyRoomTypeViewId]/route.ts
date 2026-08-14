import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  viewTypeId: z.number().int().positive(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyRoomTypeViewId: string }> };

const viewInclude = { viewType: { select: { viewTypeCode: true, viewTypeName: true } } } as const;

function serialize<T extends { propertyRoomTypeViewId: bigint; propertyRoomId: bigint; viewTypeId: bigint }>(row: T) {
  return {
    ...row,
    propertyRoomTypeViewId: Number(row.propertyRoomTypeViewId),
    propertyRoomId: Number(row.propertyRoomId),
    viewTypeId: Number(row.viewTypeId),
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeViewId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const existing = await prisma.propertyRoomTypeView.findUnique({
      where: { propertyRoomTypeViewId: BigInt(id.data) },
    });
    if (!existing) return NextResponse.json({ error: "View configuration not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.propertyRoomTypeView.updateMany({
          where: { propertyRoomId: existing.propertyRoomId, propertyRoomTypeViewId: { not: BigInt(id.data) } },
          data: { isPrimary: false },
        });
      }
      return tx.propertyRoomTypeView.update({
        where: { propertyRoomTypeViewId: BigInt(id.data) },
        data: {
          viewTypeId: BigInt(data.viewTypeId),
          isPrimary: data.isPrimary ?? false,
          isActive: data.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include: viewInclude,
      });
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "View configuration not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeViewId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyRoomTypeView.update({
      where: { propertyRoomTypeViewId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: viewInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "View configuration not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyRoomTypeViewId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyRoomTypeView.delete({ where: { propertyRoomTypeViewId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "View configuration not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
