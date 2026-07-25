import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  airlineTypeId: z.number().int().positive(),
  airlineCode: z.string().trim().min(2).max(3),
  airlineName: z.string().trim().min(1).max(200),
  airlineNumericCode: z.number().int().nullable().optional(),
  pnrMaxDigit: z.number().int().min(1).max(50),
  tktMaxDigit: z.number().int().min(1).max(50),
  isTktNumberOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const airlineTypeId = searchParams.get("airlineTypeId");

    const where: Prisma.AirlineWhereInput = {};
    if (activeOnly) where.isActive = true;
    if (airlineTypeId) where.airlineTypeId = Number(airlineTypeId);

    const rows = await prisma.airline.findMany({
      where,
      include: { airlineType: { select: { airlineTypeName: true } } },
      orderBy: { airlineCode: "asc" },
    });
    return NextResponse.json(rows);
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
    const type = await prisma.airlineType.findUnique({ where: { airlineTypeId: data.airlineTypeId } });
    if (!type) return NextResponse.json({ error: "Airline type not found" }, { status: 400 });

    const created = await prisma.airline.create({
      data: {
        airlineTypeId: data.airlineTypeId,
        airlineCode: data.airlineCode.trim().toUpperCase(),
        airlineName: data.airlineName.trim(),
        airlineNumericCode: data.airlineNumericCode ?? null,
        pnrMaxDigit: data.pnrMaxDigit,
        tktMaxDigit: data.tktMaxDigit,
        isTktNumberOnly: data.isTktNumberOnly ?? false,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: { airlineType: { select: { airlineTypeName: true } } },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This airline code already exists" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
