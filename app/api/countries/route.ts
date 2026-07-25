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

const createSchema = z.object({
  countryCode: z.string().trim().min(1).max(10),
  countryName: z.string().trim().min(1).max(200),
  dialCode: z.string().trim().min(1).max(20),
  status: z.enum(["active", "inactive"]).optional(),
  createdBy: z.number().int().positive(),
});

/** Global Country master — no tenant/company filter. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const countries = await prisma.country.findMany({
      where: activeOnly ? { status: "active" } : undefined,
      orderBy: { countryName: "asc" },
    });
    return NextResponse.json(countries);
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
    const created = await prisma.country.create({
      data: {
        countryCode: data.countryCode.toUpperCase(),
        countryName: data.countryName,
        dialCode: data.dialCode,
        status: data.status ?? "active",
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This country code is already in use" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
