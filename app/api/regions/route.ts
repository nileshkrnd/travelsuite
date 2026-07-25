import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const listQuerySchema = z.object({
  tenantId: z.coerce.number().int().positive(),
  companyId: z.coerce.number().int().positive(),
});

const createSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  regionCode: z.string().trim().min(1, "Region code is required").max(100),
  regionName: z.string().trim().min(1, "Region name is required").max(200),
  createdBy: z.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      tenantId: searchParams.get("tenantId"),
      companyId: searchParams.get("companyId"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "tenantId and companyId are required" }, { status: 400 });
    }

    const regions = await prisma.region.findMany({
      where: {
        tenantId: parsed.data.tenantId,
        companyId: parsed.data.companyId,
      },
      orderBy: { regionCode: "asc" },
    });
    return NextResponse.json(regions);
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

    const region = await prisma.region.create({
      data: {
        tenantId: parsed.data.tenantId,
        companyId: parsed.data.companyId,
        regionCode: parsed.data.regionCode,
        regionName: parsed.data.regionName,
        createdBy: parsed.data.createdBy,
      },
    });
    return NextResponse.json(region, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This region code is already in use for this company" },
        { status: 409 }
      );
    }
    return dbUnavailable(error);
  }
}
