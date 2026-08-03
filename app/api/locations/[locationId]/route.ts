import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  countryId: z.number().int().positive(),
  stateId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive(),
  areaId: z.number().int().positive(),
  locationCode: z.string().trim().min(1).max(30),
  locationName: z.string().trim().min(1).max(150),
  nativeName: z.string().trim().max(150).optional().or(z.literal("")),
  locationTypeId: z.number().int().positive().nullable().optional(),
  zoneNumber: z.string().trim().max(20).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  googlePlaceId: z.string().trim().max(255).optional().or(z.literal("")),
  displayOrder: z.number().int().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

type RouteContext = { params: Promise<{ locationId: string }> };

const includeArgs = {
  country: { select: { countryCode: true } },
  state: { select: { stateName: true } },
  city: { select: { cityName: true } },
  area: { select: { areaName: true } },
  locationType: { select: { locationTypeName: true } },
} as const;

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { locationId } = await context.params;
    const id = idSchema.safeParse(locationId);
    if (!id.success) return NextResponse.json({ error: "Invalid location id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updated = await prisma.location.update({
      where: { locationId: id.data },
      data: {
        countryId: data.countryId,
        stateId: data.stateId ?? null,
        cityId: data.cityId,
        areaId: data.areaId,
        locationCode: data.locationCode.trim().toUpperCase(),
        locationName: data.locationName,
        nativeName: data.nativeName?.trim() || null,
        locationTypeId: data.locationTypeId ?? null,
        zoneNumber: data.zoneNumber?.trim() || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        googlePlaceId: data.googlePlaceId?.trim() || null,
        displayOrder: data.displayOrder,
        isPopular: data.isPopular,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: includeArgs,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Location not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This location code is already in use for the selected area" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { locationId } = await context.params;
    const id = idSchema.safeParse(locationId);
    if (!id.success) return NextResponse.json({ error: "Invalid location id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.location.update({
      where: { locationId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: includeArgs,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

/** Soft delete — sets IsDeleted = true rather than removing the row. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { locationId } = await context.params;
    const id = idSchema.safeParse(locationId);
    if (!id.success) return NextResponse.json({ error: "Invalid location id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const modifiedBy = Number(searchParams.get("modifiedBy"));

    await prisma.location.update({
      where: { locationId: id.data },
      data: {
        isDeleted: true,
        modifiedBy: Number.isFinite(modifiedBy) && modifiedBy > 0 ? modifiedBy : undefined,
        modifiedDtTm: new Date(),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
