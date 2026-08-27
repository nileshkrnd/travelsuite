import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { propertyFloorInclude } from "@/lib/api/property-floor-unit-helpers";

function parseId(raw: string | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = BigInt(raw);
  return value > BigInt(0) ? value : null;
}

const updateSchema = z.object({
  propertyId: z.number().int().positive(),
  floorCode: z.string().trim().min(1).max(50),
  floorNumber: z.number().int(),
  floorName: z.string().trim().min(1).max(100),
  floorTypeId: z.number().int().positive(),
  displayOrder: z.number().int().optional(),
  totalUnits: z.number().int().min(0).nullable().optional(),
  occupiedUnits: z.number().int().min(0).nullable().optional(),
  availableUnits: z.number().int().min(0).nullable().optional(),
  floorArea: z.number().nonnegative().nullable().optional(),
  areaUnitId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

function serialize<T extends { propertyFloorId: bigint; floorTypeId: bigint; areaUnitId: bigint | null }>(row: T) {
  return {
    ...row,
    propertyFloorId: Number(row.propertyFloorId),
    floorTypeId: Number(row.floorTypeId),
    areaUnitId: row.areaUnitId != null ? Number(row.areaUnitId) : null,
  };
}

type RouteContext = { params: Promise<{ propertyFloorId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).propertyFloorId);
    if (id == null) return NextResponse.json({ error: "Invalid floor id" }, { status: 400 });
    const row = await prisma.propertyFloor.findUnique({ where: { propertyFloorId: id }, include: propertyFloorInclude });
    if (!row) return NextResponse.json({ error: "Floor not found" }, { status: 404 });
    return NextResponse.json(serialize(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).propertyFloorId);
    if (id == null) return NextResponse.json({ error: "Invalid floor id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.propertyFloor.update({
      where: { propertyFloorId: id },
      data: {
        propertyId: data.propertyId,
        floorCode: data.floorCode.trim().toUpperCase(),
        floorNumber: data.floorNumber,
        floorName: data.floorName.trim(),
        floorTypeId: BigInt(data.floorTypeId),
        displayOrder: data.displayOrder ?? data.floorNumber,
        totalUnits: data.totalUnits ?? null,
        occupiedUnits: data.occupiedUnits ?? null,
        availableUnits: data.availableUnits ?? null,
        floorArea: data.floorArea ?? null,
        areaUnitId: data.areaUnitId != null ? BigInt(data.areaUnitId) : null,
        description: data.description?.trim() || null,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyFloorInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Floor not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This floor code or number already exists for this property" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).propertyFloorId);
    if (id == null) return NextResponse.json({ error: "Invalid floor id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.propertyFloor.update({
      where: { propertyFloorId: id },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyFloorInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Floor not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).propertyFloorId);
    if (id == null) return NextResponse.json({ error: "Invalid floor id" }, { status: 400 });
    await prisma.propertyFloor.delete({ where: { propertyFloorId: id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Floor not found" }, { status: 404 });
      if (error.code === "P2003") {
        return NextResponse.json({ error: "This floor has units and cannot be deleted" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}
