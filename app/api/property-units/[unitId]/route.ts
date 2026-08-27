import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { propertyUnitInclude, refreshFloorUnitCounts, serializePropertyUnits } from "@/lib/api/property-floor-unit-helpers";

function parseId(raw: string | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = BigInt(raw);
  return value > BigInt(0) ? value : null;
}

const optionalId = z.number().int().positive().nullable().optional();
const optionalCount = z.number().int().min(0).nullable().optional();

const updateSchema = z.object({
  propertyId: z.number().int().positive(),
  propertyFloorId: z.number().int().positive(),
  unitCode: z.string().trim().min(1).max(50),
  unitNumber: z.string().trim().min(1).max(50),
  unitName: z.string().trim().max(150).nullable().optional(),
  unitTypeId: z.number().int().positive(),
  unitCategoryId: optionalId,
  unitStatusId: z.number().int().positive(),
  area: z.number().positive(),
  areaUnitId: z.number().int().positive(),
  bedroomCount: optionalCount,
  bathroomCount: optionalCount,
  parkingCount: optionalCount,
  balconyCount: optionalCount,
  furnishedStatusId: optionalId,
  viewTypeId: optionalId,
  unitDescription: z.string().trim().max(1000).nullable().optional(),
  isRentable: z.boolean().optional(),
  isSaleable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ unitId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).unitId);
    if (id == null) return NextResponse.json({ error: "Invalid unit id" }, { status: 400 });
    const row = await prisma.propertyUnit.findUnique({ where: { unitId: id }, include: propertyUnitInclude });
    if (!row) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    return NextResponse.json((await serializePropertyUnits([row]))[0]);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).unitId);
    if (id == null) return NextResponse.json({ error: "Invalid unit id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const existing = await prisma.propertyUnit.findUnique({ where: { unitId: id } });
    if (!existing) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    const floor = await prisma.propertyFloor.findUnique({ where: { propertyFloorId: BigInt(data.propertyFloorId) } });
    if (!floor) return NextResponse.json({ error: "Floor not found" }, { status: 400 });
    if (floor.propertyId !== data.propertyId) {
      return NextResponse.json({ error: "Floor does not belong to the selected property" }, { status: 400 });
    }

    const updated = await prisma.propertyUnit.update({
      where: { unitId: id },
      data: {
        propertyId: data.propertyId,
        propertyFloorId: BigInt(data.propertyFloorId),
        unitCode: data.unitCode.trim().toUpperCase(),
        unitNumber: data.unitNumber.trim(),
        unitName: data.unitName?.trim() || null,
        unitTypeId: BigInt(data.unitTypeId),
        unitCategoryId: data.unitCategoryId != null ? BigInt(data.unitCategoryId) : null,
        unitStatusId: BigInt(data.unitStatusId),
        area: data.area,
        areaUnitId: BigInt(data.areaUnitId),
        bedroomCount: data.bedroomCount ?? null,
        bathroomCount: data.bathroomCount ?? null,
        parkingCount: data.parkingCount ?? null,
        balconyCount: data.balconyCount ?? null,
        furnishedStatusId: data.furnishedStatusId != null ? BigInt(data.furnishedStatusId) : null,
        viewTypeId: data.viewTypeId != null ? BigInt(data.viewTypeId) : null,
        unitDescription: data.unitDescription?.trim() || null,
        isRentable: data.isRentable,
        isSaleable: data.isSaleable,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyUnitInclude,
    });

    await refreshFloorUnitCounts(updated.propertyFloorId);
    if (existing.propertyFloorId !== updated.propertyFloorId) {
      await refreshFloorUnitCounts(existing.propertyFloorId);
    }

    return NextResponse.json((await serializePropertyUnits([updated]))[0]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This unit code already exists for this property" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).unitId);
    if (id == null) return NextResponse.json({ error: "Invalid unit id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const existing = await prisma.propertyUnit.findUnique({ where: { unitId: id } });
    if (!existing) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    const updated = await prisma.propertyUnit.update({
      where: { unitId: id },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: propertyUnitInclude,
    });
    await refreshFloorUnitCounts(updated.propertyFloorId);
    return NextResponse.json((await serializePropertyUnits([updated]))[0]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = parseId((await context.params).unitId);
    if (id == null) return NextResponse.json({ error: "Invalid unit id" }, { status: 400 });
    const existing = await prisma.propertyUnit.findUnique({ where: { unitId: id } });
    if (!existing) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    await prisma.propertyUnit.delete({ where: { unitId: id } });
    await refreshFloorUnitCounts(existing.propertyFloorId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
