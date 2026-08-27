import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { propertyUnitInclude, refreshFloorUnitCounts, serializePropertyUnits } from "@/lib/api/property-floor-unit-helpers";

const optionalId = z.number().int().positive().nullable().optional();
const optionalCount = z.number().int().min(0).nullable().optional();

const rowSchema = z.object({
  unitId: z.number().int().positive().nullable().optional(),
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
});

const batchSchema = z.object({
  propertyId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  modifiedBy: z.number().int().positive().optional(),
  rows: z.array(rowSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const property = await prisma.property.findUnique({ where: { propertyId: data.propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 400 });

    const codes = data.rows.map((r) => r.unitCode.trim().toUpperCase());
    if (new Set(codes).size !== codes.length) {
      return NextResponse.json({ error: "Unit codes must be unique in this sheet" }, { status: 400 });
    }

    const keepIds = data.rows
      .map((row) => row.unitId)
      .filter((id): id is number => id != null && id > 0)
      .map((id) => BigInt(id));

    const remaining = await prisma.propertyUnit.findMany({
      where: {
        propertyId: data.propertyId,
        ...(keepIds.length > 0 ? { unitId: { notIn: keepIds } } : {}),
      },
      select: { unitCode: true },
    });
    const remainingCodes = new Set(remaining.map((u) => u.unitCode.trim().toUpperCase()));
    const clash = codes.find((code) => remainingCodes.has(code));
    if (clash) {
      return NextResponse.json({ error: `This unit code already exists for this property: ${clash}` }, { status: 409 });
    }

    const propertyFloors = await prisma.propertyFloor.findMany({
      where: { propertyId: data.propertyId },
      select: { propertyFloorId: true },
    });
    const floorIds = new Set(propertyFloors.map((f) => Number(f.propertyFloorId)));
    for (const row of data.rows) {
      if (!floorIds.has(row.propertyFloorId)) {
        return NextResponse.json({ error: "Floor does not belong to the selected property" }, { status: 400 });
      }
    }

    const existingById = new Map(
      keepIds.length === 0
        ? []
        : (
            await prisma.propertyUnit.findMany({
              where: { unitId: { in: keepIds } },
              select: { unitId: true, propertyId: true, propertyFloorId: true },
            })
          ).map((row) => [Number(row.unitId), row] as const)
    );

    for (const row of data.rows) {
      if (!row.unitId) continue;
      const existing = existingById.get(row.unitId);
      if (!existing || existing.propertyId !== data.propertyId) {
        return NextResponse.json({ error: "Unit not found for this property" }, { status: 400 });
      }
    }

    const affectedFloors = new Set<bigint>();

    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const row of data.rows) {
        const payload = {
          propertyId: data.propertyId,
          propertyFloorId: BigInt(row.propertyFloorId),
          unitCode: row.unitCode.trim().toUpperCase(),
          unitNumber: row.unitNumber.trim(),
          unitName: row.unitName?.trim() || null,
          unitTypeId: BigInt(row.unitTypeId),
          unitCategoryId: row.unitCategoryId != null ? BigInt(row.unitCategoryId) : null,
          unitStatusId: BigInt(row.unitStatusId),
          area: row.area,
          areaUnitId: BigInt(row.areaUnitId),
          bedroomCount: row.bedroomCount ?? null,
          bathroomCount: row.bathroomCount ?? null,
          parkingCount: row.parkingCount ?? null,
          balconyCount: row.balconyCount ?? null,
          furnishedStatusId: row.furnishedStatusId != null ? BigInt(row.furnishedStatusId) : null,
          viewTypeId: row.viewTypeId != null ? BigInt(row.viewTypeId) : null,
          unitDescription: row.unitDescription?.trim() || null,
          isRentable: row.isRentable ?? true,
          isSaleable: row.isSaleable ?? false,
          isActive: row.isActive ?? true,
        };
        affectedFloors.add(payload.propertyFloorId);
        if (row.unitId) {
          const existing = existingById.get(row.unitId)!;
          affectedFloors.add(existing.propertyFloorId);
          results.push(
            await tx.propertyUnit.update({
              where: { unitId: BigInt(row.unitId) },
              data: {
                ...payload,
                modifiedBy: data.modifiedBy ?? data.createdBy,
                modifiedDtTm: new Date(),
              },
              include: propertyUnitInclude,
            })
          );
        } else {
          results.push(
            await tx.propertyUnit.create({
              data: { ...payload, createdBy: data.createdBy },
              include: propertyUnitInclude,
            })
          );
        }
      }
      return results;
    });

    for (const floorId of affectedFloors) {
      await refreshFloorUnitCounts(floorId);
    }

    return NextResponse.json(await serializePropertyUnits(saved));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This unit code already exists for this property" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
