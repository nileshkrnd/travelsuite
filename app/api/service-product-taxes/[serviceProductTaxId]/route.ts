import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { rowInclude, validateServiceProductTaxLookups } from "../route";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  serviceProductId: z.number().int().positive(),
  serviceProductSupplierId: z.number().int().positive().nullable().optional(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  taxId: z.number().int().positive(),
  taxName: z.string().trim().min(1).max(200),
  taxCalculationTypeId: z.number().int().positive(),
  taxRate: z.number().nonnegative().nullable().optional(),
  taxAmount: z.number().nonnegative().nullable().optional(),
  taxApplicationBasisId: z.number().int().positive(),
  isInclusive: z.boolean().optional(),
  isCompound: z.boolean().optional(),
  sequenceNo: z.number().int().min(0).optional(),
  fromDate: z.string().trim().min(1),
  toDate: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  remarks: z.string().trim().max(500).nullable().optional(),
  modifiedBy: z.number().int().positive(),
});

const patchSchema = z.object({
  isActive: z.boolean(),
  modifiedBy: z.number().int().positive(),
});

type RouteContext = { params: Promise<{ serviceProductTaxId: string }> };

function toRow<
  T extends {
    serviceProductTaxId: bigint;
    serviceProductId: bigint;
    serviceProductSupplierId: bigint | null;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    taxId: bigint;
    taxCalculationTypeId: bigint;
    taxApplicationBasisId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductTaxId: Number(row.serviceProductTaxId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    taxId: Number(row.taxId),
    taxCalculationTypeId: Number(row.taxCalculationTypeId),
    taxApplicationBasisId: Number(row.taxApplicationBasisId),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { serviceProductTaxId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const row = await prisma.serviceProductTax.findUnique({
      where: { serviceProductTaxId: BigInt(id.data) },
      include: rowInclude,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toRow(row));
  } catch (error) {
    return dbUnavailable(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { serviceProductTaxId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    const data = parsed.data;

    const { error } = await validateServiceProductTaxLookups(data);
    if (error) return error;

    const updated = await prisma.serviceProductTax.update({
      where: { serviceProductTaxId: BigInt(id.data) },
      data: {
        serviceProductSupplierId: data.serviceProductSupplierId != null ? BigInt(data.serviceProductSupplierId) : null,
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        taxId: BigInt(data.taxId),
        taxName: data.taxName.trim(),
        taxCalculationTypeId: BigInt(data.taxCalculationTypeId),
        taxRate: data.taxRate ?? null,
        taxAmount: data.taxAmount ?? null,
        taxApplicationBasisId: BigInt(data.taxApplicationBasisId),
        isInclusive: data.isInclusive ?? false,
        isCompound: data.isCompound ?? false,
        sequenceNo: data.sequenceNo ?? 0,
        fromDate: new Date(data.fromDate),
        toDate: data.toDate ? new Date(data.toDate) : null,
        isActive: data.isActive,
        remarks: data.remarks?.trim() || null,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { serviceProductTaxId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.serviceProductTax.update({
      where: { serviceProductTaxId: BigInt(id.data) },
      data: { isActive: parsed.data.isActive, modifiedBy: parsed.data.modifiedBy, modifiedDtTm: new Date() },
      include: rowInclude,
    });
    return NextResponse.json(toRow(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { serviceProductTaxId: raw } = await context.params;
    const id = idSchema.safeParse(raw);
    if (!id.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.serviceProductTax.delete({ where: { serviceProductTaxId: BigInt(id.data) } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return dbUnavailable(error);
  }
}
