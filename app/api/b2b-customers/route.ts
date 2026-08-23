import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
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
  createdBy: z.number().int().positive(),
});

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const typeIdParam = searchParams.get("b2bCustomerTypeId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.B2BCustomerWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (typeIdParam != null && typeIdParam !== "") where.b2bCustomerTypeId = BigInt(typeIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.b2BCustomer.findMany({
      where,
      include: rowInclude,
      orderBy: [{ b2bCustomerName: "asc" }],
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

    if (data.parentB2bCustomerId != null) {
      const parent = await prisma.b2BCustomer.findUnique({ where: { b2bCustomerId: BigInt(data.parentB2bCustomerId) } });
      if (!parent) return NextResponse.json({ error: "Parent B2B customer not found" }, { status: 400 });
    }

    const created = await prisma.b2BCustomer.create({
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
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This customer code already exists for this company" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
