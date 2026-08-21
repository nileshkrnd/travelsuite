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
  marketTypeId: z.number().int().positive(),
  regionId: z.number().int().positive().nullable().optional(),
  countryId: z.number().int().positive().nullable().optional(),
  cityId: z.number().int().positive().nullable().optional(),
  marketGroupId: z.number().int().positive().nullable().optional(),
  ruleTypeId: z.number().int().positive(),
  fromDate: z.string().trim().min(1).nullable().optional(),
  toDate: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
});

export type ServiceProductMarketRuleWriteData = z.infer<typeof createSchema>;
export type ServiceProductMarketRuleLookupData = Omit<ServiceProductMarketRuleWriteData, "createdBy">;

export const rowInclude = {
  serviceProduct: { select: { serviceProductName: true } },
  supplierLink: { select: { supplier: { select: { supplierName: true } } } },
  option: { select: { optionName: true } },
  variant: { select: { variantName: true } },
  marketType: { select: { marketTypeName: true, marketTypeCode: true } },
  region: { select: { regionName: true } },
  country: { select: { countryName: true } },
  city: { select: { cityName: true } },
  marketGroup: { select: { marketGroupName: true } },
  ruleType: { select: { ruleTypeName: true, ruleTypeCode: true } },
} as const;

function toRow<
  T extends {
    serviceProductMarketRuleId: bigint;
    serviceProductId: bigint;
    serviceProductSupplierId: bigint | null;
    serviceProductOptionId: bigint | null;
    serviceProductVariantId: bigint | null;
    marketTypeId: bigint;
    marketGroupId: bigint | null;
    ruleTypeId: bigint;
  },
>(row: T) {
  return {
    ...row,
    serviceProductMarketRuleId: Number(row.serviceProductMarketRuleId),
    serviceProductId: Number(row.serviceProductId),
    serviceProductSupplierId: row.serviceProductSupplierId != null ? Number(row.serviceProductSupplierId) : null,
    serviceProductOptionId: row.serviceProductOptionId != null ? Number(row.serviceProductOptionId) : null,
    serviceProductVariantId: row.serviceProductVariantId != null ? Number(row.serviceProductVariantId) : null,
    marketTypeId: Number(row.marketTypeId),
    marketGroupId: row.marketGroupId != null ? Number(row.marketGroupId) : null,
    ruleTypeId: Number(row.ruleTypeId),
  };
}

export async function validateMarketRuleLookups(
  data: ServiceProductMarketRuleLookupData
): Promise<{ error: NextResponse | null; tenantId: number; companyId: number }> {
  const product = await prisma.serviceProduct.findUnique({ where: { serviceProductId: BigInt(data.serviceProductId) } });
  if (!product) {
    return { error: NextResponse.json({ error: "Service product not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
  }

  const marketType = await prisma.marketType.findUnique({ where: { marketTypeId: BigInt(data.marketTypeId) } });
  if (!marketType || marketType.tenantId !== product.tenantId || marketType.companyId !== product.companyId) {
    return { error: NextResponse.json({ error: "Market type not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
  }

  const ruleType = await prisma.ruleType.findUnique({ where: { ruleTypeId: BigInt(data.ruleTypeId) } });
  if (!ruleType) {
    return { error: NextResponse.json({ error: "Rule type not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
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
  if (data.marketGroupId != null) {
    const group = await prisma.marketGroup.findUnique({ where: { marketGroupId: BigInt(data.marketGroupId) } });
    if (!group || group.tenantId !== product.tenantId || group.companyId !== product.companyId) {
      return { error: NextResponse.json({ error: "Market group not found" }, { status: 400 }), tenantId: 0, companyId: 0 };
    }
  }

  return { error: null, tenantId: product.tenantId, companyId: product.companyId };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get("serviceProductId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Prisma.ServiceProductMarketRuleWhereInput = {};
    if (productIdParam != null && productIdParam !== "") where.serviceProductId = BigInt(productIdParam);
    if (activeOnly) where.isActive = true;

    const rows = await prisma.serviceProductMarketRule.findMany({
      where,
      include: rowInclude,
      orderBy: [{ createdDtTm: "desc" }],
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

    const { error } = await validateMarketRuleLookups(data);
    if (error) return error;

    const created = await prisma.serviceProductMarketRule.create({
      data: {
        serviceProductId: BigInt(data.serviceProductId),
        serviceProductSupplierId: data.serviceProductSupplierId != null ? BigInt(data.serviceProductSupplierId) : null,
        serviceProductOptionId: data.serviceProductOptionId != null ? BigInt(data.serviceProductOptionId) : null,
        serviceProductVariantId: data.serviceProductVariantId != null ? BigInt(data.serviceProductVariantId) : null,
        marketTypeId: BigInt(data.marketTypeId),
        regionId: data.regionId ?? null,
        countryId: data.countryId ?? null,
        cityId: data.cityId ?? null,
        marketGroupId: data.marketGroupId != null ? BigInt(data.marketGroupId) : null,
        ruleTypeId: BigInt(data.ruleTypeId),
        fromDate: data.fromDate ? new Date(data.fromDate) : null,
        toDate: data.toDate ? new Date(data.toDate) : null,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
      include: rowInclude,
    });
    return NextResponse.json(toRow(created), { status: 201 });
  } catch (error) {
    return dbUnavailable(error);
  }
}
