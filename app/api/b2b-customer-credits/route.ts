import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppB2BCustomerCredit } from "@/lib/mappers/b2b-customer-related.mapper";

const createSchema = z.object({
  b2bCustomerId: z.number().int().positive(),
  creditLimit: z.number().min(0),
  creditDays: z.number().int().min(0),
  paymentTermId: z.number().int().positive().nullable().optional(),
  b2bCustomerCreditStatusId: z.number().int().positive(),
  effectiveFrom: z.string().trim().min(1),
  effectiveTo: z.string().trim().min(1).nullable().optional(),
  approvedBy: z.number().int().positive().nullable().optional(),
  remarks: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

const include = {
  paymentTerm: { select: { paymentTermName: true } },
  creditStatus: { select: { creditStatusName: true } },
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("b2bCustomerId");
    const where: Prisma.B2BCustomerCreditWhereInput = {};
    if (customerId) where.b2bCustomerId = BigInt(customerId);
    if (searchParams.get("activeOnly") === "true") where.isActive = true;
    const rows = await prisma.b2BCustomerCredit.findMany({
      where,
      include,
      orderBy: [{ isActive: "desc" }, { effectiveFrom: "desc" }],
    });
    return NextResponse.json(rows.map(toAppB2BCustomerCredit));
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
      const isActive = data.isActive ?? true;
      if (isActive) {
        await tx.b2BCustomerCredit.updateMany({
          where: { b2bCustomerId: BigInt(data.b2bCustomerId), isActive: true },
          data: { isActive: false },
        });
      }
      return tx.b2BCustomerCredit.create({
        data: {
          b2bCustomerId: BigInt(data.b2bCustomerId),
          creditLimit: data.creditLimit,
          creditDays: data.creditDays,
          paymentTermId: data.paymentTermId != null ? BigInt(data.paymentTermId) : null,
          b2bCustomerCreditStatusId: BigInt(data.b2bCustomerCreditStatusId),
          effectiveFrom: new Date(data.effectiveFrom),
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
          approvedBy: data.approvedBy ?? null,
          approvedDtTm: data.approvedBy ? new Date() : null,
          remarks: data.remarks?.trim() || null,
          isActive,
          createdBy: data.createdBy,
        },
        include,
      });
    });
    return NextResponse.json(toAppB2BCustomerCredit(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This customer already has an active credit record" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
