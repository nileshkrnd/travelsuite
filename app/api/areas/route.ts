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
  cityId: z.coerce.number().int().positive().optional(),
});

const createSchema = z.object({
  countryId: z.number().int().positive(),
  cityId: z.number().int().positive(),
  areaCode: z.string().trim().min(1).max(30),
  areaName: z.string().trim().min(1).max(150),
  nativeName: z.string().trim().max(150).optional().or(z.literal("")),
  areaTypeId: z.number().int().positive().optional(),
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
  city: { select: { cityName: true } },
  areaType: { select: { areaTypeName: true } },
} as const;

/** Global Area master — filter by Country and/or City. Excludes soft-deleted rows by default. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      countryId: searchParams.get("countryId") ?? undefined,
      cityId: searchParams.get("cityId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const areas = await prisma.area.findMany({
      where: {
        ...(parsed.data.cityId ? { cityId: parsed.data.cityId } : {}),
        ...(parsed.data.countryId ? { countryId: parsed.data.countryId } : {}),
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      include: includeArgs,
      orderBy: [{ displayOrder: "asc" }, { areaName: "asc" }],
    });
    return NextResponse.json(areas);
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
    const created = await prisma.area.create({
      data: {
        countryId: data.countryId,
        cityId: data.cityId,
        areaCode: data.areaCode.trim().toUpperCase(),
        areaName: data.areaName,
        nativeName: data.nativeName?.trim() || null,
        areaTypeId: data.areaTypeId,
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
        { error: "This area code is already in use for the selected city" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
