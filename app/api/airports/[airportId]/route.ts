import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  airportCode: z.string().trim().min(3).max(3),
  airportName: z.string().trim().min(1).max(300),
  countryId: z.number().int().positive(),
  cityId: z.number().int().positive(),
  parentAirportId: z.number().int().min(0).optional(),
  latitude: z.string().trim().max(20).nullable().optional(),
  longitude: z.string().trim().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});
const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ airportId: string }> };

async function withParentCode<T extends { parentAirportId: number }>(row: T) {
  if (row.parentAirportId <= 0) return { ...row, parentAirportCode: null as string | null };
  const parent = await prisma.airport.findUnique({
    where: { airportId: row.parentAirportId },
    select: { airportCode: true },
  });
  return { ...row, parentAirportCode: parent?.airportCode ?? null };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { airportId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid airport id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
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
    if (parentAirportId === id.data) {
      return NextResponse.json({ error: "Airport cannot be its own parent" }, { status: 400 });
    }
    if (parentAirportId > 0) {
      const parent = await prisma.airport.findUnique({ where: { airportId: parentAirportId } });
      if (!parent) return NextResponse.json({ error: "Parent airport not found" }, { status: 400 });
    }

    const updated = await prisma.airport.update({
      where: { airportId: id.data },
      data: {
        airportCode: data.airportCode.trim().toUpperCase(),
        airportName: data.airportName.trim(),
        countryId: data.countryId,
        cityId: data.cityId,
        parentAirportId,
        latitude: data.latitude?.trim() || null,
        longitude: data.longitude?.trim() || null,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: {
        country: { select: { countryName: true } },
        city: { select: { cityName: true } },
      },
    });
    return NextResponse.json(await withParentCode(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Airport not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This airport code already exists" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { airportId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid airport id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.airport.update({
      where: { airportId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: {
        country: { select: { countryName: true } },
        city: { select: { cityName: true } },
      },
    });
    return NextResponse.json(await withParentCode(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Airport not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { airportId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid airport id" }, { status: 400 });

    const children = await prisma.airport.count({ where: { parentAirportId: id.data } });
    if (children > 0) {
      return NextResponse.json({ error: "Remove child airports before deleting this airport" }, { status: 409 });
    }

    await prisma.airport.delete({ where: { airportId: id.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Airport not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
