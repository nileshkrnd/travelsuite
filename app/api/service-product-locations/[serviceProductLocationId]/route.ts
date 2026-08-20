import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceProductLocationTypeId: z.number().int().positive(),
  countryId: z.number().int().positive(),
  regionId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive().nullable().optional(),
  areaId: z.number().int().positive().nullable().optional(),
  locationName: z.string().trim().min(1).max(250),
  addressLine1: z.string().trim().max(500).nullable().optional(),
  addressLine2: z.string().trim().max(500).nullable().optional(),
  postalCode: z.string().trim().max(30).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  googlePlaceId: z.string().trim().max(200).nullable().optional(),
  googleMapUrl: z.string().trim().max(1000).nullable().optional(),
  locationInstructions: z.string().trim().max(2000).nullable().optional(),
  isPrimary: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductLocationId: string }> };

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  locationType: { select: { locationTypeName: true } },
  country: { select: { countryName: true } },
  region: { select: { regionName: true } },
  city: { select: { cityName: true } },
  area: { select: { areaName: true } },
  commonStatus: { select: { statusName: true } },
} as const;

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

function toRow<
  T extends {
    serviceProductLocationId: bigint;
    serviceProductId: bigint;
    serviceProductLocationTypeId: bigint;
    commonStatusId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductLocationId: Number(row.serviceProductLocationId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductLocationTypeId: Number(row.serviceProductLocationTypeId),
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductLocationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductLocation.findUnique({
      where: { serviceProductLocationId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductLocationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.serviceProductLocation.update({
      where: { serviceProductLocationId: BigInt(id.data) },
      data: {
        serviceProductLocationTypeId: BigInt(data.serviceProductLocationTypeId),
        countryId: data.countryId,
        regionId: data.regionId ?? null,
        cityId: data.cityId ?? null,
        areaId: data.areaId ?? null,
        locationName: data.locationName.trim(),
        addressLine1: data.addressLine1?.trim() || null,
        addressLine2: data.addressLine2?.trim() || null,
        postalCode: data.postalCode?.trim() || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        googlePlaceId: data.googlePlaceId?.trim() || null,
        googleMapUrl: data.googleMapUrl?.trim() || null,
        locationInstructions: data.locationInstructions?.trim() || null,
        isPrimary: data.isPrimary ?? false,
        displayOrder: data.displayOrder ?? 0,
        commonStatusId: BigInt(data.commonStatusId),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductLocationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductLocation.update({
      where: { serviceProductLocationId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductLocationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductLocation.delete({ where: { serviceProductLocationId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This location is linked to supplier locations and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
