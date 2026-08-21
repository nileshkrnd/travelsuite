import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbUnavailable } from "@/lib/api/db-error";
import { cancellationPolicyTypeNeedsPenaltyValue } from "@/lib/constants/cancellation-policy-types";

const ruleSchema = z.object({
  fromDaysBefore: z.number().int().min(0),
  toDaysBefore: z.number().int().min(0).nullable().optional(),
  cancellationPolicyTypeId: z.number().int().positive(),
  penaltyValue: z.number().min(0),
  isActive: z.boolean().optional(),
});

const createSchema = z.object({
  serviceProductId: z.number().int().positive(),
  policyCode: z.string().trim().min(1).max(50),
  policyName: z.string().trim().min(1).max(150),
  serviceProductSupplierId: z.number().int().positive().nullable().optional(),
  serviceProductOptionId: z.number().int().positive().nullable().optional(),
  serviceProductVariantId: z.number().int().positive().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  rules: z.array(ruleSchema).optional(),
  createdBy: z.number().int().positive(),
});

export type ServiceProductCancellationPolicyWriteData = z.infer<typeof createSchema>;
export type ServiceProductCancellationPolicyLookupData = Omit<ServiceProductCancellationPolicyWriteData, "policyCode" | "policyName" | "createdBy">;

export const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  supplierLink: { select: { supplier: { select: { supplierName: true } } } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  rules: {
    orderBy: [{ fromDaysBefore: "desc" as const }],
    include: { policyType: { select: { cancellationPolicyTypeCode: true, cancellationPolicyTypeName: true } } },
  },
};

function toRow<
  T extends {
    serviceProductCancellationPolicyId: bigint;
    serviceProductId: bigint;
    serviceProductSupplierId: bigint | null;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    rules?: { serviceProductCancellationPolicyRuleId: bigint; serviceProductCancellationPolicyId: bigint; cancellationPolicyTypeId: bigint }[];
  },
>(row: T) {
  return {
    ...row,
    serviceProductCancellationPolicyId: Number(row.serviceProductCancellationPolicyId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    rules: row.rules?.map((r) => ({
      ...r,
      serviceProductCancellationPolicyRuleId: Number(r.serviceProductCancellationPolicyRuleId),
      serviceProductCancellationPolicyId: Number(r.serviceProductCancellationPolicyId),
      cancellationPolicyTypeId: Number(r.cancellationPolicyTypeId),
    })),
  };
}

export async function validateCancellationPolicyLookups(
  data: ServiceProductCancellationPolicyLookupData
): Promise<{ error: NextResponse | null; tenantId: number; companyId: number }> {
  const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
  if (!product) {
    return { error: NextResponse.json({ error: "Service product not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
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

  for (const rule of data.rules ?? []) {
    const policyType = await prisma.cancellationPolicyType.findUnique({ where: { cancellationPolicyTypeId: BigInt(rule.cancellationPolicyTypeId) } });
    if (!policyType || policyType.tenantId !== product.tenantId || policyType.companyId !== product.companyId || !policyType.isActive) {
      return { error: NextResponse.json({ error: "Cancellation policy type not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
    }
    const code = policyType.cancellationPolicyTypeCode.toUpperCase();
    if (cancellationPolicyTypeNeedsPenaltyValue(code) && rule.penaltyValue <= 0) {
      return {
        error: NextResponse.json({ error: "Nights and Percentage rules require a penalty value greater than zero" }, { status: 400 }),
        tenantId: 0,
        companyId: 0,
      };
    }
    if (rule.toDaysBefore != null && rule.toDaysBefore >= 0 && rule.fromDaysBefore < rule.toDaysBefore) {
      return {
        error: NextResponse.json({ error: "From days before must be greater than or equal to to days before" }, { status: 400 }),
        tenantId: 0,
        companyId: 0,
      };
    }
  }

  return { error: null, tenantId: product.tenantId, companyId: product.companyId };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductCancellationPolicyWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductCancellationPolicy.findMany({
      where,
      include: rowInclude,
      orderBy: [{ policyCode: "asc" }],
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

    const { error } = await validateCancellationPolicyLookups(data);
    if (error) return error;

    const created = await prisma.serviceProductCancellationPolicy.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        policyCode: data.policyCode.trim(),
        policyName: data.policyName.trim(),
        serviceProductSupplierId: data.serviceProductSupplierId != null ? BigInt(data.serviceProductSupplierId) : null,
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        rules: {
          create: (data.rules ?? []).map((r) => ({
            fromDaysBefore: r.fromDaysBefore,
            toDaysBefore: r.toDaysBefore ?? null,
            cancellationPolicyTypeId: BigInt(r.cancellationPolicyTypeId),
            penaltyValue: r.penaltyValue,
            isActive: r.isActive ?? true,
            createdBy: data.createdBy,
          })),
        },
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Policy code already exists on this product" }, { status: 409 });
    }
    return dbUnavailable(error);
  }
}
