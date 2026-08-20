import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
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
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  locationType: { select: { locationTypeName: true } },
  country: { select: { countryName: true } },
  region: { select: { regionName: true } },
  city: { select: { cityName: true } },
  area: { select: { areaName: true } },
  commonStatus: { select: { statusName: true } },
} as const;

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductLocationWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductLocation.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { locationName: "asc" }],
    });
    return NextResponse.json(rows.map(toRow));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
    if (!product) return NextResponse.json({ error: "Service product not found" }, { status: 400 });

    const locationType = await prisma.serviceProductLocationType.findUnique({
      where: { serviceProductLocationTypeId: BigInt(data.serviceProductLocationTypeId) },
    });
    if (!locationType) return NextResponse.json({ error: "Location type not found" }, { status: 400 });

    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) return NextResponse.json({ error: "Status not found" }, { status: 400 });

    const created = await prisma.serviceProductLocation.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
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
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
