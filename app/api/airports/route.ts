import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  airportCode: z.string().trim().min(3).max(3),
  airportName: z.string().trim().min(1).max(300),
  countryId: z.number().int().positive(),
  cityId: z.number().int().positive(),
  parentAirportId: z.number().int().min(0).optional(),
  latitude: z.string().trim().max(20).nullable().optional(),
  longitude: z.string().trim().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

async function enrichAirports(
  rows: Array<{
    airportId: number;
    airportCode: string;
    airportName: string;
    countryId: number;
    cityId: number;
    parentAirportId: number;
    latitude: string | null;
    longitude: string | null;
    isActive: boolean | null;
    createdBy: number | null;
    createdDtTm: Date | null;
    modifiedBy: number | null;
    modifiedDtTm: Date | null;
    country: { countryName: string };
    city: { cityName: string };
  }>
) {
  const parentIds = [...new Set(rows.map((r) => r.parentAirportId).filter((id) => id > 0))];
  const parents =
    parentIds.length === 0
      ? []
      : await prisma.airport.findMany({
          where: { airportId: { in: parentIds } },
          select: { airportId: true, airportCode: true },
        });
  const parentCode = new Map(parents.map((p) => [p.airportId, p.airportCode]));
  return rows.map((row) => ({
    ...row,
    parentAirportCode: row.parentAirportId > 0 ? (parentCode.get(row.parentAirportId) ?? null) : null,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const countryId = searchParams.get("countryId");
    const cityId = searchParams.get("cityId");

    const where: Prisma.AirportWhereInput = {};
    if (activeOnly) where.isActive = true;
    if (countryId) where.countryId = Number(countryId);
    if (cityId) where.cityId = Number(cityId);

    const rows = await prisma.airport.findMany({
      where,
      include: {
        country: { select: { countryName: true } },
        city: { select: { cityName: true } },
      },
      orderBy: { airportCode: "asc" },
    });
    return NextResponse.json(await enrichAirports(rows));
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
    const city = await prisma.city.findUnique({ where: { cityId: data.cityId } });
    if (!city || city.countryId !== data.countryId) {
      return NextResponse.json({ error: "City does not belong to the selected country" }, { status: 400 });
    }

    const parentAirportId = data.parentAirportId ?? 0;
    if (parentAirportId > 0) {
      const parent = await prisma.airport.findUnique({ where: { airportId: parentAirportId } });
      if (!parent) return NextResponse.json({ error: "Parent airport not found" }, { status: 400 });
    }

    const created = await prisma.airport.create({
      data: {
        airportCode: data.airportCode.trim().toUpperCase(),
        airportName: data.airportName.trim(),
        countryId: data.countryId,
        cityId: data.cityId,
        parentAirportId,
        latitude: data.latitude?.trim() || null,
        longitude: data.longitude?.trim() || null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: {
        country: { select: { countryName: true } },
        city: { select: { cityName: true } },
      },
    });
    const [enriched] = await enrichAirports([created]);
    return NextResponse.json(enriched, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This airport code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
