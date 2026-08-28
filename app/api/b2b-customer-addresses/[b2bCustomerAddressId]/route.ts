import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppB2BCustomerAddress } from "@/lib/mappers/b2b-customer-related.mapper";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  addressTypeId: z.number().int().positive(),
  addressLine1: z.string().trim().min(1).max(250),
  addressLine2: z.string().trim().max(250).nullable().optional(),
  area: z.string().trim().max(150).nullable().optional(),
  countryId: z.number().int().positive(),
  stateId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive().nullable().optional(),
  postalCode: z.string().trim().max(30).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const include = {
  addressType: { select: { addressTypeName: true } },
  country: { select: { countryName: true } },
  state: { select: { stateName: true } },
  city: { select: { cityName: true } },
} as const;
type RouteContext = { params: Promise<{ b2bCustomerAddressId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = idSchema.safeParse((await context.params).b2bCustomerAddressId);
    if (!id.success) return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const existing = await prisma.b2BCustomerAddress.findUnique({ where: { b2bCustomerAddressId: BigInt(id.data) } });
    if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.b2BCustomerAddress.updateMany({
          where: { b2bCustomerId: existing.b2bCustomerId, isPrimary: true, b2bCustomerAddressId: { not: BigInt(id.data) } },
          data: { isPrimary: false },
        });
      }
      return tx.b2BCustomerAddress.update({
        where: { b2bCustomerAddressId: BigInt(id.data) },
        data: {
          addressTypeId: BigInt(data.addressTypeId),
          addressLine1: data.addressLine1.trim(),
          addressLine2: data.addressLine2?.trim() || null,
          area: data.area?.trim() || null,
          countryId: data.countryId,
          stateId: data.stateId ?? null,
          cityId: data.cityId ?? null,
          postalCode: data.postalCode?.trim() || null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          isPrimary: data.isPrimary ?? existing.isPrimary,
          isActive: data.isActive ?? existing.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include,
      });
    });
    return NextResponse.json(toAppB2BCustomerAddress(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = idSchema.safeParse((await context.params).b2bCustomerAddressId);
    if (!id.success) return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    await prisma.b2BCustomerAddress.delete({ where: { b2bCustomerAddressId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
