import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  regionCode: z.string().trim().min(1, "Region code is required").max(100),
  regionName: z.string().trim().min(1, "Region name is required").max(200),
  modifiedBy: z.number().int().positive(),
});

const scopeQuerySchema = z.object({
  tenantId: z.coerce.number().int().positive(),
  companyId: z.coerce.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId: rawId } = await context.params;
    const regionId = idSchema.safeParse(rawId);
    if (!regionId.success) {
      return NextResponse.json({ error: "Invalid region id" }, { status: 400 });
    }

    const region = await prisma.region.findUnique({ where: { regionId: regionId.data } });
    if (!region) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    return NextResponse.json(region);
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId: rawId } = await context.params;
    const regionId = idSchema.safeParse(rawId);
    if (!regionId.success) {
      return NextResponse.json({ error: "Invalid region id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const existing = await prisma.region.findUnique({ where: { regionId: regionId.data } });
    if (!existing) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    if (existing.tenantId !== parsed.data.tenantId || existing.companyId !== parsed.data.companyId) {
      return NextResponse.json({ error: "Region is outside the requested scope" }, { status: 403 });
    }

    const region = await prisma.region.update({
      where: { regionId: regionId.data },
      data: {
        regionCode: parsed.data.regionCode,
        regionName: parsed.data.regionName,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    return NextResponse.json(region);
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId: rawId } = await context.params;
    const regionId = idSchema.safeParse(rawId);
    if (!regionId.success) {
      return NextResponse.json({ error: "Invalid region id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const scope = scopeQuerySchema.safeParse({
      tenantId: searchParams.get("tenantId"),
      companyId: searchParams.get("companyId"),
    });
    if (!scope.success) {
      return NextResponse.json({ error: "tenantId and companyId are required" }, { status: 400 });
    }

    const existing = await prisma.region.findUnique({ where: { regionId: regionId.data } });
    if (!existing) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }
    if (existing.tenantId !== scope.data.tenantId || existing.companyId !== scope.data.companyId) {
      return NextResponse.json({ error: "Region is outside the requested scope" }, { status: 403 });
    }

    await prisma.region.delete({ where: { regionId: regionId.data } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
