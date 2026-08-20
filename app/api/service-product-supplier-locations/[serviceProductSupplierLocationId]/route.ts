import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceProductLocationId: z.number().int().positive().nullable().optional(),
  serviceProductLocationTypeId: z.number().int().positive(),
  countryId: z.number().int().positive(),
  regionId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive().nullable().optional(),
  areaId: z.number().int().positive().nullable().optional(),
  supplierLocationCode: z.string().trim().max(100).nullable().optional(),
  supplierLocationName: z.string().trim().min(1).max(250),
  supplierLocationReference: z.string().trim().max(200).nullable().optional(),
  addressLine1: z.string().trim().max(500).nullable().optional(),
  addressLine2: z.string().trim().max(500).nullable().optional(),
  postalCode: z.string().trim().max(30).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  supplierGooglePlaceId: z.string().trim().max(200).nullable().optional(),
  locationInstructions: z.string().trim().max(2000).nullable().optional(),
  isPickupAvailable: z.boolean().optional(),
  isDropoffAvailable: z.boolean().optional(),
  isMeetingPoint: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  commonStatusId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductSupplierLocationId: string }> };

const rowInclude = {
  supplierLink: { select: { supplier: { select: { supplierName: true } } } },
  location: { select: { locationName: true } },
  locationType: { select: { locationTypeName: true } },
  country: { select: { countryName: true } },
  region: { select: { regionName: true } },
  city: { select: { cityName: true } },
  area: { select: { areaName: true } },
  commonStatus: { select: { statusName: true } },
} as const;

function toRow<
  T extends {
    serviceProductSupplierLocationId: bigint;
    serviceProductSupplierId: bigint;
    serviceProductLocationId: bigint | null;
    serviceProductLocationTypeId: bigint;
    commonStatusId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductSupplierLocationId: Number(row.serviceProductSupplierLocationId),
    serviceProductSupplierId: Number(row.serviceProductSupplierId),
    serviceProductLocationId: row.serviceProductLocationId != null ? Number(row.serviceProductLocationId) : null,
    serviceProductLocationTypeId: Number(row.serviceProductLocationTypeId),
    commonStatusId: Number(row.commonStatusId),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductSupplierLocationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductSupplierLocation.findUnique({
      where: { serviceProductSupplierLocationId: BigInt(id.data) },
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
    const { serviceProductSupplierLocationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.serviceProductSupplierLocation.update({
      where: { serviceProductSupplierLocationId: BigInt(id.data) },
      data: {
        serviceProductLocationId: data.serviceProductLocationId != null ? BigInt(data.serviceProductLocationId) : null,
        serviceProductLocationTypeId: BigInt(data.serviceProductLocationTypeId),
        countryId: data.countryId,
        regionId: data.regionId ?? null,
        cityId: data.cityId ?? null,
        areaId: data.areaId ?? null,
        supplierLocationCode: data.supplierLocationCode?.trim() || null,
        supplierLocationName: data.supplierLocationName.trim(),
        supplierLocationReference: data.supplierLocationReference?.trim() || null,
        addressLine1: data.addressLine1?.trim() || null,
        addressLine2: data.addressLine2?.trim() || null,
        postalCode: data.postalCode?.trim() || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        supplierGooglePlaceId: data.supplierGooglePlaceId?.trim() || null,
        locationInstructions: data.locationInstructions?.trim() || null,
        isPickupAvailable: data.isPickupAvailable ?? false,
        isDropoffAvailable: data.isDropoffAvailable ?? false,
        isMeetingPoint: data.isMeetingPoint ?? false,
        isPrimary: data.isPrimary ?? false,
        isAvailable: data.isAvailable ?? true,
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
    const { serviceProductSupplierLocationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductSupplierLocation.update({
      where: { serviceProductSupplierLocationId: BigInt(id.data) },
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
    const { serviceProductSupplierLocationId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductSupplierLocation.delete({ where: { serviceProductSupplierLocationId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
