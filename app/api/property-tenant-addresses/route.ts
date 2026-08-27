import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
  propertyTenantId: z.number().int().positive(),
  propertyTenantAddressTypeId: z.number().int().positive(),
  addressLine1: z.string().trim().min(1).max(250),
  addressLine2: z.string().trim().max(250).nullable().optional(),
  area: z.string().trim().max(150).nullable().optional(),
  countryId: z.number().int().positive(),
  stateId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive().nullable().optional(),
  postalCode: z.string().trim().max(30).nullable().optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const rowInclude = {
  addressType: { select: { addressTypeName: true } },
  country: { select: { countryName: true } },
  state: { select: { stateName: true } },
  city: { select: { cityName: true } },
} as const;

function serialize<T extends { propertyTenantAddressId: bigint; propertyTenantId: bigint; propertyTenantAddressTypeId: bigint }>(row: T) {
  return {
    ...row,
    propertyTenantAddressId: Number(row.propertyTenantAddressId),
    propertyTenantId: Number(row.propertyTenantId),
    propertyTenantAddressTypeId: Number(row.propertyTenantAddressTypeId),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyTenantIdParam = searchParams.get("propertyTenantId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.PropertyTenantAddressWhereInput = {};
    if (propertyTenantIdParam != null && propertyTenantIdParam !== "") where.propertyTenantId = BigInt(propertyTenantIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.propertyTenantAddress.findMany({
      where,
      include: rowInclude,
      orderBy: [{ createdDtTm: "desc" }],
    });
    return NextResponse.json(rows.map(serialize));
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

    const tenant = await prisma.propertyTenant.findUnique({ where: { propertyTenantId: BigInt(data.propertyTenantId) } });
    if (!tenant) return NextResponse.json({ error: "Property tenant not found" }, { status: 400 });

    const created = await prisma.propertyTenantAddress.create({
      data: {
        propertyTenantId: BigInt(data.propertyTenantId),
        propertyTenantAddressTypeId: BigInt(data.propertyTenantAddressTypeId),
        addressLine1: data.addressLine1.trim(),
        addressLine2: data.addressLine2?.trim() || null,
        area: data.area?.trim() || null,
        countryId: data.countryId,
        stateId: data.stateId ?? null,
        cityId: data.cityId ?? null,
        postalCode: data.postalCode?.trim() || null,
        isPrimary: data.isPrimary ?? false,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
