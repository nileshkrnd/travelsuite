import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  countryId: z.number().int().positive(),
  stateCode: z.string().trim().min(1).max(20),
  isoCode: z.string().trim().max(20).optional().or(z.literal("")),
  stateName: z.string().trim().min(1).max(150),
  nativeName: z.string().trim().max(150).optional().or(z.literal("")),
  stateAdministrativeTypeId: z.number().int().positive().nullable().optional(),
  capitalCityId: z.number().int().positive().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  displayOrder: z.number().int().optional(),
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

type RouteContext = { params: Promise<{ stateId: string }> };

const includeArgs = {
  country: { select: { countryCode: true } },
  administrativeType: { select: { typeName: true } },
  capitalCity: { select: { cityName: true } },
} as const;

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { stateId } = await context.params;
    const id = idSchema.safeParse(stateId);
    if (!id.success) return NextResponse.json({ error: "Invalid state id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updated = await prisma.state.update({
      where: { stateId: id.data },
      data: {
        countryId: data.countryId,
        stateCode: data.stateCode.trim().toUpperCase(),
        isoCode: data.isoCode?.trim() || null,
        stateName: data.stateName,
        nativeName: data.nativeName?.trim() || null,
        stateAdministrativeTypeId: data.stateAdministrativeTypeId ?? null,
        capitalCityId: data.capitalCityId ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: includeArgs,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "State not found" }, { status: 404 });
      if (error.code === "P2002") {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        const message = target.includes("ISOCode")
          ? "This ISO code is already in use"
          : "This state code is already in use for the selected country";
        return NextResponse.json({ error: message }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { stateId } = await context.params;
    const id = idSchema.safeParse(stateId);
    if (!id.success) return NextResponse.json({ error: "Invalid state id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await prisma.state.update({
      where: { stateId: id.data },
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
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

/** Soft delete — sets IsDeleted = true rather than removing the row. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { stateId } = await context.params;
    const id = idSchema.safeParse(stateId);
    if (!id.success) return NextResponse.json({ error: "Invalid state id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const modifiedBy = Number(searchParams.get("modifiedBy"));

    await prisma.state.update({
      where: { stateId: id.data },
      data: {
        isDeleted: true,
        modifiedBy: Number.isFinite(modifiedBy) && modifiedBy > 0 ? modifiedBy : undefined,
        modifiedDtTm: new Date(),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
