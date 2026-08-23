import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const idSchema = z.coerce.number().int().positive();

const rowInclude = {
  customerType: { select: { customerTypeName: true } },
  category: { select: { categoryName: true } },
  parent: { select: { b2bCustomerName: true } },
  country: { select: { countryName: true } },
  currency: { select: { currencyCode: true } },
  paymentTerm: { select: { paymentTermName: true } },
  accountManager: { select: { firstName: true, lastName: true } },
  status: { select: { statusName: true } },
} as const;

const updateSchema = z.object({
  b2bCustomerCode: z.string().trim().min(1).max(50),
  b2bCustomerName: z.string().trim().min(1).max(250),
  b2bCustomerTypeId: z.number().int().positive(),
  b2bCustomerCategoryId: z.number().int().positive().nullable().optional(),
  parentB2bCustomerId: z.number().int().positive().nullable().optional(),
  registrationNumber: z.string().trim().max(100).nullable().optional(),
  taxRegistrationNumber: z.string().trim().max(100).nullable().optional(),
  countryId: z.number().int().positive(),
  currencyId: z.number().int().positive(),
  paymentTermId: z.number().int().positive().nullable().optional(),
  creditLimit: z.number().min(0).nullable().optional(),
  creditDays: z.number().int().min(0).nullable().optional(),
  accountManagerId: z.number().int().positive().nullable().optional(),
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

type RouteContext = { params: Promise<{ b2bCustomerId: string }> };

function isForeignKeyRestrictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return true;
  const message = error instanceof Error ? error.message : "";
  return /23001|23503|violates[\s\S]*foreign key constraint/i.test(message);
}

function serialize<
  T extends {
    b2bCustomerId: bigint;
    b2bCustomerTypeId: bigint;
    b2bCustomerCategoryId: bigint | null;
    parentB2bCustomerId: bigint | null;
    paymentTermId: bigint | null;
    statusId: bigint;
  },
>(row: T) {
  return {
    ...row,
    b2bCustomerId: Number(row.b2bCustomerId),
    b2bCustomerTypeId: Number(row.b2bCustomerTypeId),
    b2bCustomerCategoryId: row.b2bCustomerCategoryId != null ? Number(row.b2bCustomerCategoryId) : null,
    parentB2bCustomerId: row.parentB2bCustomerId != null ? Number(row.parentB2bCustomerId) : null,
    paymentTermId: row.paymentTermId != null ? Number(row.paymentTermId) : null,
    statusId: Number(row.statusId),
  };
}

/** Rejects self-parenting and cycles. */
async function assertValidParent(customerId: number, parentId: number | null | undefined): Promise<string | null> {
  if (parentId == null) return null;
  if (parentId === customerId) return "A customer cannot be its own parent";

  let cursor: number | null = parentId;
  const seen = new Set<number>();
  while (cursor != null) {
    if (cursor === customerId) return "Cannot set parent — would create a cycle";
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const row: { parentB2bCustomerId: bigint | null } | null = await prisma.b2BCustomer.findUnique({
      where: { b2bCustomerId: BigInt(cursor) },
      select: { parentB2bCustomerId: true },
    });
    cursor = row?.parentB2bCustomerId != null ? Number(row.parentB2bCustomerId) : null;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { b2bCustomerId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const row = await prisma.b2BCustomer.findUnique({
      where: { b2bCustomerId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "B2B customer not found" }, { status: 404 });
    return NextResponse.json(serialize(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { b2bCustomerId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const type = await prisma.b2BCustomerType.findUnique({
      where: { b2bCustomerTypeId: BigInt(data.b2bCustomerTypeId) },
    });
    if (!type) return NextResponse.json({ error: "B2B customer type not found" }, { status: 400 });

    if (data.b2bCustomerCategoryId != null) {
      const category = await prisma.b2BCustomerCategory.findUnique({
        where: { b2bCustomerCategoryId: BigInt(data.b2bCustomerCategoryId) },
      });
      if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });
      if (Number(category.b2bCustomerTypeId) !== data.b2bCustomerTypeId) {
        return NextResponse.json({ error: "Category must belong to the same customer type" }, { status: 400 });
      }
    }

    const parentError = await assertValidParent(id.data, data.parentB2bCustomerId);
    if (parentError) return NextResponse.json({ error: parentError }, { status: 400 });

    const updated = await prisma.b2BCustomer.update({
      where: { b2bCustomerId: BigInt(id.data) },
      data: {
        b2bCustomerCode: data.b2bCustomerCode.trim().toUpperCase(),
        b2bCustomerName: data.b2bCustomerName.trim(),
        b2bCustomerTypeId: BigInt(data.b2bCustomerTypeId),
        b2bCustomerCategoryId: data.b2bCustomerCategoryId != null ? BigInt(data.b2bCustomerCategoryId) : null,
        parentB2bCustomerId: data.parentB2bCustomerId != null ? BigInt(data.parentB2bCustomerId) : null,
        registrationNumber: data.registrationNumber?.trim() || null,
        taxRegistrationNumber: data.taxRegistrationNumber?.trim() || null,
        countryId: data.countryId,
        currencyId: data.currencyId,
        paymentTermId: data.paymentTermId != null ? BigInt(data.paymentTermId) : null,
        creditLimit: data.creditLimit ?? null,
        creditDays: data.creditDays ?? null,
        accountManagerId: data.accountManagerId ?? null,
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
      if (error.code === "P2025") return NextResponse.json({ error: "B2B customer not found" }, { status: 404 });
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This customer code already exists for this company" }, { status: 409 });
      }
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { b2bCustomerId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.b2BCustomer.update({
      where: { b2bCustomerId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(serialize(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "B2B customer not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { b2bCustomerId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    await prisma.b2BCustomer.delete({ where: { b2bCustomerId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "B2B customer not found" }, { status: 404 });
    }
    if (isForeignKeyRestrictError(error)) {
      return NextResponse.json({ error: "This customer has related records and cannot be deleted" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
