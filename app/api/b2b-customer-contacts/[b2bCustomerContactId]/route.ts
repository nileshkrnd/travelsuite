import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppB2BCustomerContact } from "@/lib/mappers/b2b-customer-related.mapper";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
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
  modifiedBy: z.number().int().positive(),
});

const include = { contactType: { select: { contactTypeName: true } } } as const;
type RouteContext = { params: Promise<{ b2bCustomerContactId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = idSchema.safeParse((await context.params).b2bCustomerContactId);
    if (!id.success) return NextResponse.json({ error: "Invalid contact id" }, { status: 400 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const existing = await prisma.b2BCustomerContact.findUnique({ where: { b2bCustomerContactId: BigInt(id.data) } });
    if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.b2BCustomerContact.updateMany({
          where: { b2bCustomerId: existing.b2bCustomerId, isPrimary: true, b2bCustomerContactId: { not: BigInt(id.data) } },
          data: { isPrimary: false },
        });
      }
      return tx.b2BCustomerContact.update({
        where: { b2bCustomerContactId: BigInt(id.data) },
        data: {
          contactTypeId: BigInt(data.contactTypeId),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          designation: data.designation?.trim() || null,
          email: data.email?.trim() || null,
          mobileCountryCode: data.mobileCountryCode?.trim() || null,
          mobileNumber: data.mobileNumber?.trim() || null,
          phoneCountryCode: data.phoneCountryCode?.trim() || null,
          phoneNumber: data.phoneNumber?.trim() || null,
          isPrimary: data.isPrimary ?? existing.isPrimary,
          isActive: data.isActive ?? existing.isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include,
      });
    });
    return NextResponse.json(toAppB2BCustomerContact(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = idSchema.safeParse((await context.params).b2bCustomerContactId);
    if (!id.success) return NextResponse.json({ error: "Invalid contact id" }, { status: 400 });
    await prisma.b2BCustomerContact.delete({ where: { b2bCustomerContactId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
