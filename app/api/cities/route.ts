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
  countryCode: z.string().trim().min(1).max(10).optional(),
  countryId: z.coerce.number().int().positive().optional(),
});

const createSchema = z.object({
  countryId: z.number().int().positive(),
  cityCode: z.string().trim().min(1).max(100),
  cityName: z.string().trim().min(1).max(200),
  status: z.enum(["active", "inactive"]).optional(),
  createdBy: z.number().int().positive(),
});

/** Global City master — filter by Country only (no tenant/company). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      countryCode: searchParams.get("countryCode") ?? undefined,
      countryId: searchParams.get("countryId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const activeOnly = searchParams.get("activeOnly") === "true";
    let countryId = parsed.data.countryId;

    if (!countryId && parsed.data.countryCode) {
      const country = await prisma.country.findUnique({
        where: { countryCode: parsed.data.countryCode.toUpperCase() },
        select: { countryId: true },
      });
      if (!country) return NextResponse.json([]);
      countryId = country.countryId;
    }

    const cities = await prisma.city.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(activeOnly ? { status: "active" } : {}),
      },
      include: { country: { select: { countryCode: true } } },
      orderBy: { cityName: "asc" },
    });
    return NextResponse.json(cities);
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
    const created = await prisma.city.create({
      data: {
        countryId: data.countryId,
        cityCode: data.cityCode.trim().toUpperCase().replace(/\s+/g, "_"),
        cityName: data.cityName,
        status: data.status ?? "active",
        createdBy: data.createdBy,
      },
      include: { country: { select: { countryCode: true } } },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This city code is already in use for the selected country" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
