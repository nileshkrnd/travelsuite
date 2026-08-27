import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { propertyUnitInclude, refreshFloorUnitCounts, serializePropertyUnits } from "@/lib/api/property-floor-unit-helpers";

const optionalId = z.number().int().positive().nullable().optional();
const optionalCount = z.number().int().min(0).nullable().optional();

const createSchema = z.object({
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
  createdBy: z.number().int().positive(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdParam = searchParams.get("propertyId");
    const floorIdParam = searchParams.get("propertyFloorId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyUnitWhereInput = {};
    if (propertyIdParam != null && propertyIdParam !== "") where.propertyId = Number(propertyIdParam);
    if (floorIdParam != null && floorIdParam !== "") where.propertyFloorId = BigInt(floorIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyUnit.findMany({
      where,
      include: propertyUnitInclude,
      orderBy: [{ unitNumber: "asc" }],
    });
    return NextResponse.json(await serializePropertyUnits(rows));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const floor = await prisma.propertyFloor.findUnique({ where: { propertyFloorId: BigInt(data.propertyFloorId) } });
    if (!floor) return NextResponse.json({ error: "Floor not found" }, { status: 400 });
    if (floor.propertyId !== data.propertyId) {
      return NextResponse.json({ error: "Floor does not belong to the selected property" }, { status: 400 });
    }

    const created = await prisma.propertyUnit.create({
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
        isRentable: data.isRentable ?? true,
        isSaleable: data.isSaleable ?? false,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: propertyUnitInclude,
    });
    await refreshFloorUnitCounts(created.propertyFloorId);
    const refreshed = await prisma.propertyUnit.findUnique({
      where: { unitId: created.unitId },
      include: propertyUnitInclude,
    });
    return NextResponse.json((await serializePropertyUnits([refreshed ?? created]))[0], { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This unit code already exists for this property" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
