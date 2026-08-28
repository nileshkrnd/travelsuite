import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { toAppB2BCustomerCredit } from "@/lib/mappers/b2b-customer-related.mapper";

const idSchema = z.coerce.number().int().positive();
const updateSchema = z.object({
  creditLimit: z.number().min(0),
  creditDays: z.number().int().min(0),
  paymentTermId: z.number().int().positive().nullable().optional(),
  b2bCustomerCreditStatusId: z.number().int().positive(),
  effectiveFrom: z.string().trim().min(1),
  effectiveTo: z.string().trim().min(1).nullable().optional(),
  approvedBy: z.number().int().positive().nullable().optional(),
  remarks: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  modifiedBy: z.number().int().positive(),
});

const include = {
  paymentTerm: { select: { paymentTermName: true } },
  creditStatus: { select: { creditStatusName: true } },
} as const;
type RouteContext = { params: Promise<{ b2bCustomerCreditId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = idSchema.safeParse((await context.params).b2bCustomerCreditId);
    if (!id.success) return NextResponse.json({ error: "Invalid credit id" }, { status: 400 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;
    const existing = await prisma.b2BCustomerCredit.findUnique({ where: { b2bCustomerCreditId: BigInt(id.data) } });
    if (!existing) return NextResponse.json({ error: "Credit record not found" }, { status: 404 });

    const isActive = data.isActive ?? existing.isActive;
    const updated = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.b2BCustomerCredit.updateMany({
          where: { b2bCustomerId: existing.b2bCustomerId, isActive: true, b2bCustomerCreditId: { not: BigInt(id.data) } },
          data: { isActive: false },
        });
      }
      return tx.b2BCustomerCredit.update({
        where: { b2bCustomerCreditId: BigInt(id.data) },
        data: {
          creditLimit: data.creditLimit,
          creditDays: data.creditDays,
          paymentTermId: data.paymentTermId != null ? BigInt(data.paymentTermId) : null,
          b2bCustomerCreditStatusId: BigInt(data.b2bCustomerCreditStatusId),
          effectiveFrom: new Date(data.effectiveFrom),
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
          approvedBy: data.approvedBy ?? existing.approvedBy,
          approvedDtTm: data.approvedBy && !existing.approvedDtTm ? new Date() : existing.approvedDtTm,
          remarks: data.remarks?.trim() || null,
          isActive,
          modifiedBy: data.modifiedBy,
          modifiedDtTm: new Date(),
        },
        include,
      });
    });
    return NextResponse.json(toAppB2BCustomerCredit(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Credit record not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = idSchema.safeParse((await context.params).b2bCustomerCreditId);
    if (!id.success) return NextResponse.json({ error: "Invalid credit id" }, { status: 400 });
    await prisma.b2BCustomerCredit.delete({ where: { b2bCustomerCreditId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Credit record not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
