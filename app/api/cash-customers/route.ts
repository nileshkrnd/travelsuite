import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
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
  createdBy: z.number().int().positive(),
});

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get("tenantId");
    const companyIdParam = searchParams.get("companyId");
    const typeIdParam = searchParams.get("cashCustomerTypeId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.CashCustomerWhereInput = {};
    if (tenantIdParam != null && tenantIdParam !== "") where.tenantId = Number(tenantIdParam);
    if (companyIdParam != null && companyIdParam !== "") where.companyId = Number(companyIdParam);
    if (typeIdParam != null && typeIdParam !== "") where.cashCustomerTypeId = BigInt(typeIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.cashCustomer.findMany({
      where,
      include: rowInclude,
      orderBy: [{ customerName: "asc" }],
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

    const type = await prisma.cashCustomerTypeMaster.findUnique({ where: { cashCustomerTypeId: BigInt(data.cashCustomerTypeId) } });
    if (!type) return NextResponse.json({ error: "Cash customer type not found" }, { status: 400 });

    const created = await prisma.cashCustomer.create({
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
