import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

const listQuerySchema = z.object({
  countryId: z.coerce.number().int().positive().optional(),
  stateId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  areaId: z.coerce.number().int().positive().optional(),
});

const createSchema = z.object({
  countryId: z.number().int().positive(),
  stateId: z.number().int().positive().optional(),
  cityId: z.number().int().positive(),
  areaId: z.number().int().positive(),
  locationCode: z.string().trim().min(1).max(30),
  locationName: z.string().trim().min(1).max(150),
  nativeName: z.string().trim().max(150).optional().or(z.literal("")),
  locationTypeId: z.number().int().positive().optional(),
  zoneNumber: z.string().trim().max(20).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  googlePlaceId: z.string().trim().max(255).optional().or(z.literal("")),
  displayOrder: z.number().int().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const includeArgs = {
  country: { select: { countryCode: true } },
  state: { select: { stateName: true } },
  city: { select: { cityName: true } },
  area: { select: { areaName: true } },
  locationType: { select: { locationTypeName: true } },
} as const;

/** Global Location master — filter by Country/State/City/Area. Excludes soft-deleted rows by default. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      countryId: searchParams.get("countryId") ?? undefined,
      stateId: searchParams.get("stateId") ?? undefined,
      cityId: searchParams.get("cityId") ?? undefined,
      areaId: searchParams.get("areaId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const locations = await prisma.location.findMany({
      where: {
        ...(parsed.data.areaId ? { areaId: parsed.data.areaId } : {}),
        ...(parsed.data.cityId ? { cityId: parsed.data.cityId } : {}),
        ...(parsed.data.stateId ? { stateId: parsed.data.stateId } : {}),
        ...(parsed.data.countryId ? { countryId: parsed.data.countryId } : {}),
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      include: includeArgs,
      orderBy: [{ displayOrder: "asc" }, { locationName: "asc" }],
    });
    return NextResponse.json(locations);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const created = await prisma.location.create({
      data: {
        countryId: data.countryId,
        stateId: data.stateId,
        cityId: data.cityId,
        areaId: data.areaId,
        locationCode: data.locationCode.trim().toUpperCase(),
        locationName: data.locationName,
        nativeName: data.nativeName?.trim() || null,
        locationTypeId: data.locationTypeId,
        zoneNumber: data.zoneNumber?.trim() || null,
        latitude: data.latitude,
        longitude: data.longitude,
        googlePlaceId: data.googlePlaceId?.trim() || null,
        displayOrder: data.displayOrder ?? 0,
        isPopular: data.isPopular ?? false,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: includeArgs,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This location code is already in use for the selected area" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
