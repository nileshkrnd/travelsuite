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
  stateCode: z.string().trim().min(1).max(20),
  isoCode: z.string().trim().max(20).optional().or(z.literal("")),
  stateName: z.string().trim().min(1).max(150),
  nativeName: z.string().trim().max(150).optional().or(z.literal("")),
  stateAdministrativeTypeId: z.number().int().positive().optional(),
  capitalCityId: z.number().int().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const includeArgs = {
  country: { select: { countryCode: true } },
  administrativeType: { select: { typeName: true } },
  capitalCity: { select: { cityName: true } },
} as const;

/** Global State master — filter by Country only (no tenant/company). Excludes soft-deleted rows by default. */
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
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    let countryId = parsed.data.countryId;

    if (!countryId && parsed.data.countryCode) {
      const country = await prisma.country.findUnique({
        where: { countryCode: parsed.data.countryCode.toUpperCase() },
        select: { countryId: true },
      });
      if (!country) return NextResponse.json([]);
      countryId = country.countryId;
    }

    const states = await prisma.state.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      include: includeArgs,
      orderBy: [{ displayOrder: "asc" }, { stateName: "asc" }],
    });
    return NextResponse.json(states);
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
    const created = await prisma.state.create({
      data: {
        countryId: data.countryId,
        stateCode: data.stateCode.trim().toUpperCase(),
        isoCode: data.isoCode?.trim() || null,
        stateName: data.stateName,
        nativeName: data.nativeName?.trim() || null,
        stateAdministrativeTypeId: data.stateAdministrativeTypeId,
        capitalCityId: data.capitalCityId,
        latitude: data.latitude,
        longitude: data.longitude,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: includeArgs,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      const message = target.includes("ISOCode")
        ? "This ISO code is already in use"
        : "This state code is already in use for the selected country";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
