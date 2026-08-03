import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  countryId: z.number().int().positive(),
  cityId: z.number().int().positive(),
  areaCode: z.string().trim().min(1).max(30),
  areaName: z.string().trim().min(1).max(150),
  nativeName: z.string().trim().max(150).optional().or(z.literal("")),
  areaTypeId: z.number().int().positive().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  googlePlaceId: z.string().trim().max(255).optional().or(z.literal("")),
  displayOrder: z.number().int().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

function dbUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json(
    { error: `Database unavailable: ${message}. Ensure PostgreSQL is running and DATABASE_URL is set.` },
    { status: 503 }
  );
}

type RouteContext = { params: Promise<{ areaId: string }> };

const includeArgs = {
  country: { select: { countryCode: true } },
  city: { select: { cityName: true } },
  areaType: { select: { areaTypeName: true } },
} as const;

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { areaId } = await context.params;
    const id = idSchema.safeParse(areaId);
    if (!id.success) return NextResponse.json({ error: "Invalid area id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updated = await prisma.area.update({
      where: { areaId: id.data },
      data: {
        countryId: data.countryId,
        cityId: data.cityId,
        areaCode: data.areaCode.trim().toUpperCase(),
        areaName: data.areaName,
        nativeName: data.nativeName?.trim() || null,
        areaTypeId: data.areaTypeId ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        googlePlaceId: data.googlePlaceId?.trim() || null,
        displayOrder: data.displayOrder,
        isPopular: data.isPopular,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: includeArgs,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Area not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This area code is already in use for the selected city" },
          { status: 409 }
        );
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { areaId } = await context.params;
    const id = idSchema.safeParse(areaId);
    if (!id.success) return NextResponse.json({ error: "Invalid area id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.area.update({
      where: { areaId: id.data },
      data: {
        isActive: parsed.data.isActive,
        modifiedBy: parsed.data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: includeArgs,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

/** Soft delete — sets IsDeleted = true rather than removing the row. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { areaId } = await context.params;
    const id = idSchema.safeParse(areaId);
    if (!id.success) return NextResponse.json({ error: "Invalid area id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const modifiedBy = Number(searchParams.get("modifiedBy"));

    await prisma.area.update({
      where: { areaId: id.data },
      data: {
        isDeleted: true,
        modifiedBy: Number.isFinite(modifiedBy) && modifiedBy > 0 ? modifiedBy : undefined,
        modifiedDtTm: new Date(),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
