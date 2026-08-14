import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import {
  propertyRoomInclude,
  propertyRoomWriteSchema,
  serializePropertyRoomRow,
  toPropertyRoomUpdateScalars,
  validatePropertyRoomLookups,
} from "@/lib/api/property-room-helpers";

const idSchema = z.coerce.number().int().positive();
const updateSchema = propertyRoomWriteSchema.and(z.object({ modifiedBy: z.number().int().positive() }));
const patchSchema = z.object({ isActive: z.boolean(), modifiedBy: z.number().int().positive() });

type RouteContext = { params: Promise<{ propertyRoomId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyRoomId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.propertyRoom.findUnique({
      where: { propertyRoomId: BigInt(id.data) },
      include: propertyRoomInclude,
    });
    if (!row) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json(serializePropertyRoomRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyRoomId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const lookupError = await validatePropertyRoomLookups(data);
    if (lookupError) return lookupError;

    const updated = await prisma.propertyRoom.update({
      where: { propertyRoomId: BigInt(id.data) },
      data: toPropertyRoomUpdateScalars(data),
      include: propertyRoomInclude,
    });
    return NextResponse.json(serializePropertyRoomRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Room not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A room with this code already exists for this property" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyRoomId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyRoom.update({
      where: { propertyRoomId: BigInt(id.data) },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyRoomInclude,
    });
    return NextResponse.json(serializePropertyRoomRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyRoomId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.propertyRoom.delete({ where: { propertyRoomId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
