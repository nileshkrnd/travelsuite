import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { propertyFloorInclude } from "@/lib/api/property-floor-unit-helpers";

const rowSchema = z.object({
  propertyFloorId: z.number().int().positive().nullable().optional(),
  floorCode: z.string().trim().min(1).max(50),
  floorNumber: z.number().int(),
  floorName: z.string().trim().min(1).max(100),
  floorTypeId: z.number().int().positive(),
  displayOrder: z.number().int().optional(),
  floorArea: z.number().nonnegative().nullable().optional(),
  areaUnitId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

const batchSchema = z.object({
  propertyId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  modifiedBy: z.number().int().positive().optional(),
  rows: z.array(rowSchema).min(1),
});

function serialize<T extends { propertyFloorId: bigint; floorTypeId: bigint; areaUnitId: bigint | null }>(row: T) {
  return {
    ...row,
    propertyFloorId: Number(row.propertyFloorId),
    floorTypeId: Number(row.floorTypeId),
    areaUnitId: row.areaUnitId != null ? Number(row.areaUnitId) : null,
  };
}

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

    const codes = data.rows.map((r) => r.floorCode.trim().toUpperCase());
    const numbers = data.rows.map((r) => r.floorNumber);
    if (new Set(codes).size !== codes.length) {
      return NextResponse.json({ error: "Floor codes must be unique in this sheet" }, { status: 400 });
    }
    if (new Set(numbers).size !== numbers.length) {
      return NextResponse.json({ error: "Floor numbers must be unique in this sheet" }, { status: 400 });
    }

    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const row of data.rows) {
        const payload = {
          propertyId: data.propertyId,
          floorCode: row.floorCode.trim().toUpperCase(),
          floorNumber: row.floorNumber,
          floorName: row.floorName.trim(),
          floorTypeId: BigInt(row.floorTypeId),
          displayOrder: row.displayOrder ?? row.floorNumber,
          floorArea: row.floorArea ?? null,
          areaUnitId: row.areaUnitId != null ? BigInt(row.areaUnitId) : null,
          isActive: row.isActive ?? true,
        };
        if (row.propertyFloorId) {
          results.push(
            await tx.propertyFloor.update({
              where: { propertyFloorId: BigInt(row.propertyFloorId) },
              data: {
                ...payload,
                modifiedBy: data.modifiedBy ?? data.createdBy,
                modifiedDtTm: new Date(),
              },
              include: propertyFloorInclude,
            })
          );
        } else {
          results.push(
            await tx.propertyFloor.create({
              data: { ...payload, createdBy: data.createdBy },
              include: propertyFloorInclude,
            })
          );
        }
      }
      return results;
    });

    return NextResponse.json(saved.map(serialize));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This floor code or number already exists for this property" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
