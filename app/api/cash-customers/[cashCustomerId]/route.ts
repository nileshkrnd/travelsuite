import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  cashCustomerCode: z.string().trim().min(1).max(50),
  cashCustomerTypeId: z.number().int().positive(),
  customerName: z.string().trim().min(1).max(250),
  firstName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().max(100).nullable().optional(),
  mobileCountryCode: z.string().trim().max(10).nullable().optional(),
  mobileNumber: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  countryId: z.number().int().positive().nullable().optional(),
  nationalityId: z.number().int().positive().nullable().optional(),
  currencyId: z.number().int().positive(),
  statusId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ cashCustomerId: string }> };

const rowInclude = {
  customerType: { select: { customerTypeName: true } },
  country: { select: { countryName: true } },
  nationality: { select: { countryName: true } },
  currency: { select: { currencyCode: true } },
  status: { select: { statusName: true } },
} as const;

function serialize<T extends { cashCustomerId: bigint; cashCustomerTypeId: bigint; statusId: bigint }>(row: T) {
  return { ...row, cashCustomerId: Number(row.cashCustomerId), cashCustomerTypeId: Number(row.cashCustomerTypeId), statusId: Number(row.statusId) };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { cashCustomerId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const row = await prisma.cashCustomer.findUnique({ where: { cashCustomerId: BigInt(id.data) }, include: rowInclude });
    if (!row) return NextResponse.json({ error: "Cash customer not found" }, { status: 404 });
    return NextResponse.json(serialize(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { cashCustomerId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const type = await prisma.cashCustomerTypeMaster.findUnique({ where: { cashCustomerTypeId: BigInt(data.cashCustomerTypeId) } });
    if (!type) return NextResponse.json({ error: "Cash customer type not found" }, { status: 400 });

    const updated = await prisma.cashCustomer.update({
      where: { cashCustomerId: BigInt(id.data) },
      data: {
        cashCustomerCode: data.cashCustomerCode.trim().toUpperCase(),
        cashCustomerTypeId: BigInt(data.cashCustomerTypeId),
        customerName: data.customerName.trim(),
        firstName: data.firstName?.trim() || null,
        lastName: data.lastName?.trim() || null,
        mobileCountryCode: data.mobileCountryCode?.trim() || null,
        mobileNumber: data.mobileNumber?.trim() || null,
        email: data.email?.trim() || null,
        countryId: data.countryId ?? null,
        nationalityId: data.nationalityId ?? null,
        currencyId: data.currencyId,
        statusId: BigInt(data.statusId),
        tenantId: data.tenantId,
        companyId: data.companyId,
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Cash customer not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This customer code already exists for this company" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { cashCustomerId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.cashCustomer.update({
      where: { cashCustomerId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Cash customer not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { cashCustomerId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    await prisma.cashCustomer.delete({ where: { cashCustomerId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Cash customer not found" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "";
    if (/23001|23503|violates[\s\S]*foreign key constraint/i.test(message)) {
      return NextResponse.json({ error: "This customer has related records and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
