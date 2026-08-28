import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppB2BCustomerAddress } from "@/lib/mappers/b2b-customer-related.mapper";

const createSchema = z.object({
  b2bCustomerId: z.number().int().positive(),
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
  createdBy: z.number().int().positive(),
});

const include = {
  addressType: { select: { addressTypeName: true } },
  country: { select: { countryName: true } },
  state: { select: { stateName: true } },
  city: { select: { cityName: true } },
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("b2bCustomerId");
    const where: Prisma.B2BCustomerAddressWhereInput = {};
    if (customerId) where.b2bCustomerId = BigInt(customerId);
    if (searchParams.get("activeOnly") === "true") where.isActive = true;
    const rows = await prisma.b2BCustomerAddress.findMany({
      where,
      include,
      orderBy: [{ isPrimary: "desc" }],
    });
    return NextResponse.json(rows.map(toAppB2BCustomerAddress));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const customer = await prisma.b2BCustomer.findUnique({ where: { b2bCustomerId: BigInt(data.b2bCustomerId) } });
    if (!customer) return NextResponse.json({ error: "B2B customer not found" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.b2BCustomerAddress.updateMany({
          where: { b2bCustomerId: BigInt(data.b2bCustomerId), isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.b2BCustomerAddress.create({
        data: {
          b2bCustomerId: BigInt(data.b2bCustomerId),
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
          isPrimary: data.isPrimary ?? false,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
        include,
      });
    });
    return NextResponse.json(toAppB2BCustomerAddress(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
