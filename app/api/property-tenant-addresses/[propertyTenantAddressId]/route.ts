import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ propertyTenantAddressId: string }> };

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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { propertyTenantAddressId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid address id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.propertyTenantAddress.update({
      where: { propertyTenantAddressId: BigInt(id.data) },
      data: {
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
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { propertyTenantAddressId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid address id" }, { status: 400 });

    await prisma.propertyTenantAddress.delete({ where: { propertyTenantAddressId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
