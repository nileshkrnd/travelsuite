import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  serviceProductSupplierId: z.number().int().positive(),
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
  createdBy: z.number().int().positive(),
});

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierLinkIdParam = searchParams.get("serviceProductSupplierId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductSupplierLocationWhereInput = {};
    if (supplierLinkIdParam != null && supplierLinkIdParam !== "") where.serviceProductSupplierId = BigInt(supplierLinkIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductSupplierLocation.findMany({
      where,
      include: rowInclude,
      orderBy: [{ displayOrder: "asc" }, { supplierLocationName: "asc" }],
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

    const supplierLink = await prisma.serviceProductSupplier.findUnique({
      where: { serviceProductSupplierId: BigInt(data.serviceProductSupplierId) },
    });
    if (!supplierLink) return NextResponse.json({ error: "Service product supplier link not found" }, { status: 400 });

    const locationType = await prisma.serviceProductLocationType.findUnique({
      where: { serviceProductLocationTypeId: BigInt(data.serviceProductLocationTypeId) },
    });
    if (!locationType) return NextResponse.json({ error: "Location type not found" }, { status: 400 });

    const status = await prisma.commonStatus.findUnique({ where: { commonStatusId: BigInt(data.commonStatusId) } });
    if (!status) return NextResponse.json({ error: "Status not found" }, { status: 400 });

    const created = await prisma.serviceProductSupplierLocation.create({
      data: {
        serviceProductSupplierId: BigInt(data.serviceProductSupplierId),
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
