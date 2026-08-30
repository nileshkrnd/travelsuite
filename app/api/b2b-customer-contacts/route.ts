import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppB2BCustomerContact } from "@/lib/mappers/b2b-customer-related.mapper";

const createSchema = z.object({
  b2bCustomerId: z.number().int().positive(),
  contactTypeId: z.number().int().positive(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  designation: z.string().trim().max(150).nullable().optional(),
  email: z.string().trim().email().max(200).nullable().optional().or(z.literal("")),
  mobileCountryCode: z.string().trim().max(10).nullable().optional(),
  mobileNumber: z.string().trim().max(30).nullable().optional(),
  phoneCountryCode: z.string().trim().max(10).nullable().optional(),
  phoneNumber: z.string().trim().max(30).nullable().optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const include = { contactType: { select: { contactTypeName: true } } } as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("b2bCustomerId");
    const where: Prisma.B2BCustomerContactWhereInput = {};
    if (customerId) where.b2bCustomerId = BigInt(customerId);
    if (searchParams.get("activeOnly") === "true") where.isActive = true;
    const rows = await prisma.b2BCustomerContact.findMany({
      where,
      include,
      orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }],
    });
    return NextResponse.json(rows.map(toAppB2BCustomerContact));
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
        await tx.b2BCustomerContact.updateMany({
          where: { b2bCustomerId: BigInt(data.b2bCustomerId), isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.b2BCustomerContact.create({
        data: {
          b2bCustomerId: BigInt(data.b2bCustomerId),
          contactTypeId: BigInt(data.contactTypeId),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          designation: data.designation?.trim() || null,
          email: data.email?.trim() || null,
          mobileCountryCode: data.mobileCountryCode?.trim() || null,
          mobileNumber: data.mobileNumber?.trim() || null,
          phoneCountryCode: data.phoneCountryCode?.trim() || null,
          phoneNumber: data.phoneNumber?.trim() || null,
          isPrimary: data.isPrimary ?? false,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
        },
        include,
      });
    });
    return NextResponse.json(toAppB2BCustomerContact(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
