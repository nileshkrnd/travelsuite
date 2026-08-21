import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";

const createSchema = z.object({
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
  createdBy: z.number().int().positive(),
});

export type ServiceProductTaxWriteData = z.infer<typeof createSchema>;
export type ServiceProductTaxLookupData = Omit<ServiceProductTaxWriteData, "createdBy" | "taxName">;

export const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  supplierLink: { select: { supplier: { select: { supplierName: true } } } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  tax: { select: { taxCode: true } },
  taxCalculationType: { select: { taxCalculationTypeCode: true, taxCalculationTypeName: true } },
  taxApplicationBasis: { select: { taxApplicationBasisCode: true, taxApplicationBasisName: true } },
} as const;

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

export async function validateServiceProductTaxLookups(
  data: ServiceProductTaxLookupData
): Promise<{ error: NextResponse | null; tenantId: number; companyId: number }> {
  const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
  if (!product) {
    return { error: NextResponse.json({ error: "Service product not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
  }

  const tax = await prisma.tax.findUnique({ where: { taxId: BigInt(data.taxId) } });
  if (!tax) {
    return { error: NextResponse.json({ error: "Tax not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
  }

  const calcType = await prisma.taxCalculationType.findUnique({ where: { taxCalculationTypeId: BigInt(data.taxCalculationTypeId) } });
  if (!calcType) {
    return { error: NextResponse.json({ error: "Tax calculation type not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
  }
  const calcCode = calcType.taxCalculationTypeCode.toUpperCase();
  if (calcCode === "PERCENTAGE" && (data.taxRate == null || data.taxRate <= 0)) {
    return {
      error: NextResponse.json({ error: "Tax rate is required for a percentage calculation type" }, { status: 400 }),
      tenantId: 0,
      companyId: 0,
    };
  }
  if (calcCode === "FIXED" && (data.taxAmount == null || data.taxAmount <= 0)) {
    return {
      error: NextResponse.json({ error: "Tax amount is required for a fixed calculation type" }, { status: 400 }),
      tenantId: 0,
      companyId: 0,
    };
  }

  const basis = await prisma.taxApplicationBasis.findUnique({ where: { taxApplicationBasisId: BigInt(data.taxApplicationBasisId) } });
  if (!basis) {
    return { error: NextResponse.json({ error: "Tax application basis not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
  }

  if (data.toDate && data.fromDate > data.toDate) {
    return { error: NextResponse.json({ error: "From date must be on or before to date" }, { status: 400 }), tenantId: 0, companyId: 0 };
  }

  if (data.serviceProductSupplierId != null) {
    const link = await prisma.serviceProductSupplier.findUnique({ where: { serviceProductSupplierId: BigInt(data.serviceProductSupplierId) } });
    if (!link || link.serviceProductId !== BigInt(data.serviceProductId)) {
      return { error: NextResponse.json({ error: "Supplier link not found for this product" }, { status: 400 }), tenantId: 0, companyId: 0 };
    }
  }
  if (data.serviceProductOptionId != null) {
    const option = await prisma.serviceProductOption.findUnique({ where: { serviceProductOptionId: BigInt(data.serviceProductOptionId) } });
    if (!option || option.serviceProductId !== BigInt(data.serviceProductId)) {
      return { error: NextResponse.json({ error: "Option not found for this product" }, { status: 400 }), tenantId: 0, companyId: 0 };
    }
  }
  if (data.serviceProductVariantId != null) {
    const variant = await prisma.serviceProductVariant.findUnique({
      where: { serviceProductVariantId: BigInt(data.serviceProductVariantId) },
      include: { option: true },
    });
    if (!variant || variant.option.serviceProductId !== BigInt(data.serviceProductId)) {
      return { error: NextResponse.json({ error: "Variant not found for this product" }, { status: 400 }), tenantId: 0, companyId: 0 };
    }
  }

  return { error: null, tenantId: product.tenantId, companyId: product.companyId };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductTaxWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductTax.findMany({
      where,
      include: rowInclude,
      orderBy: [{ sequenceNo: "asc" }],
    });
    return NextResponse.json(rows.map(toRow));
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

    const { error } = await validateServiceProductTaxLookups(data);
    if (error) return error;

    const created = await prisma.serviceProductTax.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
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
        isActive: data.isActive ?? true,
        remarks: data.remarks?.trim() || null,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
