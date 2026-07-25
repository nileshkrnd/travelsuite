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
  currencyCode: z.string().trim().min(1).max(10),
  currencyName: z.string().trim().min(1).max(200),
  symbol: z.string().trim().max(20).optional(),
  smallCurrencyName: z.string().trim().min(1).max(100),
  significantDigit: z.number().int().min(0).max(6),
  status: z.enum(["active", "inactive"]).optional(),
  createdBy: z.number().int().positive(),
});

/** Global Currency master — no tenant/company filter. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const currencies = await prisma.currency.findMany({
      where: activeOnly ? { status: "active" } : undefined,
      orderBy: { currencyCode: "asc" },
    });
    return NextResponse.json(currencies);
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
    const created = await prisma.currency.create({
      data: {
        currencyCode: data.currencyCode.toUpperCase(),
        currencyName: data.currencyName,
        symbol: data.symbol ?? "",
        smallCurrencyName: data.smallCurrencyName,
        significantDigit: data.significantDigit,
        status: data.status ?? "active",
        createdBy: data.createdBy,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This currency code is already in use" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
